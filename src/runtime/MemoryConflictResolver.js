class MemoryConflictResolver {
  constructor({ trustScores = {}, preferNewer = true } = {}) {
    this.trustScores = trustScores;
    this.preferNewer = preferNewer;
  }

  resolve(existing = null, incoming = null) {
    if (!existing) {
      return { action: 'accept', record: incoming, reason: 'no_existing_record' };
    }

    const existingTrust = this._getTrust(existing);
    const incomingTrust = this._getTrust(incoming);

    if (incomingTrust > existingTrust) {
      return { action: 'replace', record: incoming, reason: 'higher_trust' };
    }

    if (incomingTrust < existingTrust) {
      return { action: 'reject', record: existing, reason: 'lower_trust' };
    }

    if (this.preferNewer && (incoming?.updatedAt || 0) >= (existing?.updatedAt || 0)) {
      return { action: 'replace', record: incoming, reason: 'newer_record' };
    }

    return { action: 'keep', record: existing, reason: 'equivalent_or_older' };
  }

  detect(existing = null, incoming = null) {
    if (!existing || !incoming) {
      return { conflict: false, reason: 'missing_record' };
    }

    return {
      conflict: existing.value !== incoming.value,
      reason: existing.value !== incoming.value ? 'value_mismatch' : 'same_value',
    };
  }

  _getTrust(record = {}) {
    const source = record?.metadata?.source || 'default';
    return typeof this.trustScores[source] === 'number' ? this.trustScores[source] : 0.5;
  }
}

module.exports = { MemoryConflictResolver };
