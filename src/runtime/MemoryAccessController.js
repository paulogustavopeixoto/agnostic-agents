class MemoryAccessController {
  constructor({ rules = [] } = {}) {
    this.rules = Array.isArray(rules) ? [...rules] : [];
  }

  canRead({ layer, key, metadata = {}, context = {} } = {}) {
    return this._evaluate('read', { layer, key, metadata, context });
  }

  canWrite({ layer, key, metadata = {}, context = {} } = {}) {
    return this._evaluate('write', { layer, key, metadata, context });
  }

  redact(record = {}, context = {}) {
    const visibleFields = context.visibleMetadataFields || null;
    if (!visibleFields) {
      return record;
    }

    return {
      ...record,
      metadata: Object.fromEntries(
        Object.entries(record.metadata || {}).filter(([key]) => visibleFields.includes(key))
      ),
    };
  }

  _evaluate(action, { layer, metadata = {}, context = {} }) {
    const trustZone = context.trustZone || null;
    const role = context.role || null;

    for (const rule of this.rules) {
      if (rule.action && rule.action !== action) continue;
      if (rule.layer && rule.layer !== layer) continue;
      if (rule.trustZone && rule.trustZone !== trustZone) continue;
      if (rule.role && rule.role !== role) continue;
      if (rule.metadataKey && metadata[rule.metadataKey] == null) continue;

      return {
        allowed: rule.effect !== 'deny',
        reason: rule.reason || (rule.effect === 'deny' ? 'policy_denied' : 'policy_allowed'),
      };
    }

    return { allowed: true, reason: 'no_matching_rule' };
  }
}

module.exports = { MemoryAccessController };
