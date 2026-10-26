const { normalizeContent } = require('./ProducerRuntime');

const STATUSES = ['completed', 'incomplete', 'failed', 'cancelled', 'uncertain'];
class ContentEnvelope {
  static create({ content, status = 'completed' } = {}) {
    if (!STATUSES.includes(status)) throw new TypeError('Unsupported content completion status.');
    return { kind: 'agnostic-agents/content', version: '1.0', status, content: normalizeContent(content) };
  }

  static parse(value) {
    if (value?.kind !== 'agnostic-agents/content' || value.version !== '1.0') {
      throw new Error('Unsupported content envelope version.');
    }
    return this.create(value);
  }

  static migrate(value, { fromVersion } = {}) {
    if (fromVersion === '1.0') return this.parse(value);
    if (fromVersion !== 'legacy') throw new Error('Unsupported content migration.');
    return this.create({ content: value.content, status: value.status || 'completed' });
  }
}

module.exports = { ContentEnvelope };
