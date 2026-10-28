const { createHash } = require('crypto');
const { invokeWithDeadline } = require('./InvocationControl');
const { ToolExecutionError, RunCancelledError } = require('../errors');

class ArtifactReadError extends ToolExecutionError {
  constructor(message) { super(message); this.retryable = false; }
}

/** Bounded artifact reads from host storage, scoped before any content is returned. */
class ArtifactResolver {
  constructor({ store, tenantId, authorize, maxBytes = 10 * 1024 * 1024, requireVersion = false,
    requireIntegrity = false, timeoutMs = 30000, maxChunks = 10000 } = {}) {
    if (typeof store?.stat !== 'function' || typeof store?.read !== 'function' ||
        typeof tenantId !== 'string' || !tenantId.trim() || typeof authorize !== 'function' ||
        !Number.isSafeInteger(maxBytes) || maxBytes < 1 ||
        !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647 ||
        !Number.isSafeInteger(maxChunks) || maxChunks < 1 || maxChunks > 1000000 ||
        typeof requireVersion !== 'boolean' || typeof requireIntegrity !== 'boolean') throw new TypeError('Invalid artifact resolver.');
    this.store = store;
    this.tenantId = tenantId;
    this.authorize = authorize;
    this.maxBytes = maxBytes;
    this.requireVersion = requireVersion;
    this.requireIntegrity = requireIntegrity;
    this.timeoutMs = timeoutMs;
    this.maxChunks = maxChunks;
  }

  async read(artifactId, { signal } = {}) {
    if (typeof artifactId !== 'string' || !artifactId.trim()) throw new TypeError('Invalid artifact ID.');
    let control;
    try {
      return await invokeWithDeadline(controlSignal => {
        control = controlSignal;
        return this._read(artifactId, controlSignal);
      }, { signal, timeoutMs: this.timeoutMs });
    } catch (error) {
      if (signal?.aborted) throw new RunCancelledError('Artifact read cancelled.');
      if (control?.aborted) throw new ArtifactReadError('Artifact read deadline exceeded.');
      if (error instanceof ArtifactReadError) throw error;
      throw new ArtifactReadError('Artifact read failed.');
    }
  }

  async _read(artifactId, signal) {
    signal.throwIfAborted();
    const request = Object.freeze({ artifactId, tenantId: this.tenantId, operation: 'read', signal });
    if (await this.authorize(request) !== true) throw new ArtifactReadError('Artifact access denied.');
    signal.throwIfAborted();
    const metadata = await this.store.stat(artifactId, request);
    signal.throwIfAborted();
    const { tenantId, sizeBytes, mimeType, version: storedVersion, etag, sha256 } = metadata || {};
    if (tenantId !== request.tenantId || !Number.isSafeInteger(sizeBytes) ||
        sizeBytes < 0 || sizeBytes > this.maxBytes) {
      throw new ArtifactReadError('Artifact scope or size violation.');
    }
    const chunks = [];
    const version = storedVersion ?? etag;
    if ((this.requireVersion || version !== undefined) && (typeof version !== 'string' || !version)) {
      throw new ArtifactReadError('Artifact version is required or invalid.');
    }
    if ((this.requireIntegrity || sha256 !== undefined) && (typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(sha256))) {
      throw new ArtifactReadError('Artifact integrity digest is required or invalid.');
    }
    const expectedHash = sha256?.toLowerCase();
    const hash = expectedHash ? createHash('sha256') : null;
    let size = 0, count = 0, iterator, ended = false;
    try {
      const iterable = await this.store.read(artifactId, { ...request, signal, version });
      const factory = iterable?.[Symbol.asyncIterator] || iterable?.[Symbol.iterator];
      if (typeof factory !== 'function') throw new ArtifactReadError('Invalid artifact stream.');
      iterator = factory.call(iterable);
      signal.throwIfAborted();
      while (true) {
        const next = await invokeWithDeadline(() => iterator.next(), { signal });
        signal.throwIfAborted();
        if (!next || typeof next !== 'object') throw new ArtifactReadError('Invalid artifact stream.');
        if (next.done) { ended = true; break; }
        if (++count > this.maxChunks) throw new ArtifactReadError('Artifact chunk budget exceeded.');
        const chunk = next.value;
        if (!(chunk instanceof Uint8Array)) throw new ArtifactReadError('Invalid artifact chunk.');
        size += chunk.byteLength;
        if (size > this.maxBytes || size > sizeBytes) throw new ArtifactReadError('Artifact exceeds declared size.');
        const copy = Buffer.from(chunk);
        hash?.update(copy);
        chunks.push(copy);
      }
    } finally {
      if (!ended && typeof iterator?.return === 'function') {
        // A non-cooperative close must not indefinitely delay a failed read.
        await invokeWithDeadline(() => iterator.return(), { timeoutMs: Math.min(1000, this.timeoutMs) }).catch(() => {});
      }
    }
    signal.throwIfAborted();
    if (size !== sizeBytes) throw new ArtifactReadError('Incomplete artifact.');
    if (hash && hash.digest('hex') !== expectedHash) throw new ArtifactReadError('Artifact integrity mismatch.');
    return { artifactId, mimeType, data: Buffer.concat(chunks, size),
      ...(version !== undefined ? { version } : {}), ...(expectedHash ? { sha256: expectedHash } : {}) };
  }
}

module.exports = { ArtifactResolver };
