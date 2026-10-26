const { BoundedHttpClient } = require('../../utils/BoundedHttpClient');
const { normalizeContent } = require('../ProducerRuntime');

class MediaJobBackend {
  constructor({ provider, apiKey, modelPath, operation, toInput, toContent, fetchImpl, timeoutMs, maxBytes } = {}) {
    if (!['fal', 'higgsfield'].includes(provider) || typeof apiKey !== 'string' || !apiKey.trim() ||
        typeof modelPath !== 'string' || !/^[\w-]+(?:\/[\w.-]+)+$/.test(modelPath) ||
        modelPath.split('/').some(part => ['.', '..'].includes(part)) ||
        !['generateImage', 'generateVideo'].includes(operation) || typeof toInput !== 'function' || typeof toContent !== 'function') {
      throw new TypeError('Invalid remote media backend.');
    }
    Object.assign(this, { provider, modelPath, operation, toInput, toContent });
    this.id = `${provider}:${modelPath}:${operation}`;
    this.http = new BoundedHttpClient({ origin: provider === 'fal' ? 'https://queue.fal.run' : 'https://api.higgsfield.ai',
      headers: { Authorization: `Key ${apiKey}` }, fetchImpl, timeoutMs, maxBytes });
  }
  _id(id) {
    if (typeof id !== 'string' || !/^[\w-]{1,256}$/.test(id)) throw new TypeError('Invalid media job ID.');
    return id;
  }
  _path(id) {
    return this.provider === 'fal' ? `/${this.modelPath.split('/').slice(0, 2).join('/')}/requests/${this._id(id)}` : `/requests/${this._id(id)}`;
  }
  async start(request, context = {}) {
    if (request.operation !== this.operation) throw new TypeError('Unsupported media job operation.');
    const input = await this.toInput({ ...request, content: normalizeContent(request.content) }, context);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Media model input must be an object.');
    context.signal?.throwIfAborted();
    const result = await this.http.request({ path: `/${this.modelPath}`, body: input, signal: context.signal });
    return { jobId: this._id(result?.request_id) };
  }
  async poll(jobId, context = {}) {
    const path = this._path(jobId);
    const result = await this.http.request({ path: `${path}/status`, method: 'GET', signal: context.signal });
    const pending = this.provider === 'fal' ? ['IN_QUEUE', 'IN_PROGRESS'] : ['queued', 'pending', 'in_progress'];
    if (pending.includes(result?.status)) return { status: 'pending' };
    if (['failed', 'nsfw', 'canceled', 'cancelled'].includes(result?.status) || result?.error) return { status: 'failed' };
    if (result?.status !== (this.provider === 'fal' ? 'COMPLETED' : 'completed')) throw new Error('Unknown media job status.');
    const data = this.provider === 'fal' ? await this.http.request({ path, method: 'GET', signal: context.signal }) : result;
    context.signal?.throwIfAborted();
    // Host resolves/imports assets with its own credentials and destination policy.
    const content = normalizeContent(await this.toContent(data, { ...context, jobId, provider: this.provider }));
    const expected = this.operation === 'generateImage' ? 'image' : 'video';
    if (!content.length || content.some(part => part.type !== expected)) throw new Error('Unexpected media job output.');
    return { status: 'completed', content };
  }
  async cancel(jobId, context = {}) {
    await this.http.request({ path: `${this._path(jobId)}/cancel`, method: this.provider === 'fal' ? 'PUT' : 'POST',
      signal: context.signal });
    return { cancellationRequested: true };
  }
}
class FalJobBackend extends MediaJobBackend {
  constructor(options = {}) { super({ ...options, provider: 'fal' }); }
}
class HiggsfieldJobBackend extends MediaJobBackend {
  constructor(options = {}) { super({ ...options, provider: 'higgsfield' }); }
}
module.exports = { FalJobBackend, HiggsfieldJobBackend };
