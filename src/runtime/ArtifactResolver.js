/** Bounded artifact reads from host storage, scoped before any content is returned. */
class ArtifactResolver {
  constructor({ store, tenantId, authorize, maxBytes = 10 * 1024 * 1024, requireVersion = false } = {}) {
    if (typeof store?.stat !== 'function' || typeof store?.read !== 'function' ||
        typeof tenantId !== 'string' || !tenantId.trim() || typeof authorize !== 'function' ||
        !Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new TypeError('Invalid artifact resolver.');
    this.store = store;
    this.tenantId = tenantId;
    this.authorize = authorize;
    this.maxBytes = maxBytes;
    this.requireVersion = requireVersion;
  }

  async read(artifactId, { signal } = {}) {
    if (typeof artifactId !== 'string' || !artifactId.trim()) throw new TypeError('Invalid artifact ID.');
    signal?.throwIfAborted();
    const request = Object.freeze({ artifactId, tenantId: this.tenantId, operation: 'read' });
    if (await this.authorize(request) !== true) throw new Error('Artifact access denied.');
    signal?.throwIfAborted();
    const metadata = await this.store.stat(artifactId, request);
    if (metadata?.tenantId !== this.tenantId || !Number.isSafeInteger(metadata.sizeBytes) ||
        metadata.sizeBytes < 0 || metadata.sizeBytes > this.maxBytes) {
      throw new Error('Artifact scope or size violation.');
    }
    const chunks = [];
    const version = metadata.version ?? metadata.etag;
    if (this.requireVersion && (typeof version !== 'string' || !version)) throw new Error('Artifact version is required.');
    let size = 0;
    for await (const chunk of this.store.read(artifactId, { ...request, signal, version })) {
      signal?.throwIfAborted();
      if (!(chunk instanceof Uint8Array)) throw new Error('Invalid artifact chunk.');
      size += chunk.byteLength;
      if (size > this.maxBytes || size > metadata.sizeBytes) throw new Error('Artifact exceeds declared size.');
      chunks.push(Buffer.from(chunk));
    }
    signal?.throwIfAborted();
    if (size !== metadata.sizeBytes) throw new Error('Incomplete artifact.');
    return { artifactId, mimeType: metadata.mimeType, data: Buffer.concat(chunks, size) };
  }
}

module.exports = { ArtifactResolver };
