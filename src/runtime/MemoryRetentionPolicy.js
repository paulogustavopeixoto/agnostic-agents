class MemoryRetentionPolicy {
  constructor({ layerRules = {} } = {}) {
    this.layerRules = layerRules;
  }

  getRule(layer) {
    return this.layerRules[layer] || {};
  }

  evaluate(record = {}, layer) {
    const rule = this.getRule(layer);
    const now = Date.now();
    const ageMs = record.updatedAt ? now - record.updatedAt : 0;

    if (record.expiresAt && record.expiresAt < now) {
      return { action: 'expire', reason: 'ttl_expired' };
    }

    if (rule.maxAgeMs && ageMs > rule.maxAgeMs) {
      return { action: 'forget', reason: 'max_age_exceeded' };
    }

    return { action: 'keep', reason: 'within_policy' };
  }

  apply(entries = [], layer) {
    return entries.map(([key, record]) => ({
      key,
      record,
      decision: this.evaluate(record, layer),
    }));
  }
}

module.exports = { MemoryRetentionPolicy };
