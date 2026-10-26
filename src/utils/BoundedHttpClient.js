const { invokeWithDeadline } = require('../runtime/InvocationControl');
const { SchemaSafety } = require('../runtime/SchemaSafety');
const { ToolExecutionError } = require('../errors');

/** Fixed-origin transport. Does not follow service-supplied URLs or retry requests. */
class BoundedHttpClient {
  constructor({ origin, headers = {}, fetchImpl = globalThis.fetch, timeoutMs = 30000, maxBytes = 1048576 } = {}) {
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
        typeof fetchImpl !== 'function' || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 104857600 ||
        !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647) throw new TypeError('Invalid HTTP transport.');
    Object.assign(this, { origin: url.origin, headers: { ...headers }, fetchImpl, timeoutMs, maxBytes });
    this.safety = new SchemaSafety({ maxBytes });
  }

  async request({ path, method = 'POST', body, rawBody, signal, binary = false }) {
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') ||
        !['GET', 'POST', 'PUT', 'DELETE'].includes(method)) throw new TypeError('Invalid HTTP request.');
    const target = new URL(path, this.origin);
    if (target.origin !== this.origin || target.hash || target.username || target.password) throw new TypeError('HTTP origin violation.');
    if (body !== undefined) this.safety.assertValue(body);
    if (rawBody !== undefined && (!(rawBody instanceof Uint8Array) || body !== undefined || rawBody.byteLength > this.maxBytes)) {
      throw new TypeError('Invalid bounded binary request.');
    }
    const serialized = rawBody !== undefined ? Buffer.from(rawBody) : body === undefined ? undefined : JSON.stringify(body);
    if (serialized && Buffer.byteLength(serialized) > this.maxBytes) throw new TypeError('HTTP request exceeds size limit.');
    let dispatched = false;
    try {
      return await invokeWithDeadline(async controlSignal => {
        dispatched = true;
        const response = await this.fetchImpl(target.href, { method, headers: { 'Content-Type': 'application/json', ...this.headers },
          body: serialized, redirect: 'error', signal: controlSignal });
        if (!response.ok) { await response.body?.cancel?.(); throw new Error('HTTP failure.'); }
        const declared = response.headers.get('content-length');
        if (declared && (!/^\d+$/.test(declared) || Number(declared) > this.maxBytes)) {
          await response.body?.cancel?.(); throw new Error('Response size violation.');
        }
        if (!response.body && response.status === 204 && !binary) return null;
        if (!response.body?.getReader) throw new Error('A streaming response body is required.');
        const reader = response.body.getReader();
        const chunks = [];
        let bytes = 0;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes > this.maxBytes) throw new Error('Response size violation.');
            chunks.push(Buffer.from(value));
          }
        } finally { try { await reader.cancel(); } finally { reader.releaseLock(); } }
        const data = Buffer.concat(chunks, bytes);
        if (!data.length && [202, 204].includes(response.status) && !binary) return null;
        if (binary) return { data, mimeType: response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream' };
        const result = JSON.parse(data.toString('utf8'));
        this.safety.assertValue(result);
        return result;
      }, { signal, timeoutMs: this.timeoutMs });
    } catch {
      const error = new ToolExecutionError('Provider HTTP request did not complete.');
      error.retryable = false;
      error.uncertain = dispatched && method !== 'GET';
      throw error;
    }
  }
}

module.exports = { BoundedHttpClient };
