const { BoundedHttpClient } = require('../../utils/BoundedHttpClient');
const { normalizeContent } = require('../ProducerRuntime');

class ElevenLabsProducer {
  constructor({ apiKey, voiceId, model, saveArtifact, fetchImpl, timeoutMs, maxBytes = 10485760 } = {}) {
    if (typeof apiKey !== 'string' || !apiKey.trim() || typeof voiceId !== 'string' || !/^[\w-]+$/.test(voiceId) ||
        typeof model !== 'string' || !model.trim() || typeof saveArtifact !== 'function') throw new TypeError('Invalid speech producer.');
    Object.assign(this, { id: 'elevenlabs', voiceId, model, saveArtifact });
    this.http = new BoundedHttpClient({ origin: 'https://api.elevenlabs.io', headers: { 'xi-api-key': apiKey },
      fetchImpl, timeoutMs, maxBytes });
  }
  supports(operation) { return operation === 'generateAudio'; }
  async produce(request, context = {}) {
    if (!this.supports(request.operation)) throw new Error('Unsupported speech operation.');
    const content = normalizeContent(request.content);
    if (!content.length || content.some(part => part.type !== 'text')) throw new TypeError('Speech requires text content.');
    const response = await this.http.request({ path: `/v1/text-to-speech/${this.voiceId}?output_format=mp3_44100_128`,
      body: { text: content.map(part => part.text).join('\n'), model_id: this.model }, signal: context.signal, binary: true });
    if (response.mimeType !== 'audio/mpeg') throw new Error('Unexpected speech media type.');
    context.signal?.throwIfAborted();
    const artifact = await this.saveArtifact({ data: response.data, mimeType: response.mimeType }, context);
    const output = normalizeContent([{ type: 'audio', artifactId: artifact?.artifactId, mimeType: 'audio/mpeg' }]);
    return { content: output };
  }
}
module.exports = { ElevenLabsProducer };
