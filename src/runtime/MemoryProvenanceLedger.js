class MemoryProvenanceLedger {
  constructor({ records = [] } = {}) {
    this.records = Array.isArray(records) ? [...records] : [];
  }

  record(entry = {}) {
    const normalized = {
      id: entry.id || `memory-event-${this.records.length + 1}`,
      type: entry.type || 'unknown',
      layer: entry.layer || null,
      key: entry.key || null,
      outcome: entry.outcome || 'recorded',
      actor: entry.actor || null,
      trustZone: entry.trustZone || null,
      metadata: entry.metadata || {},
      timestamp: entry.timestamp || new Date().toISOString(),
    };
    this.records.push(normalized);
    return normalized;
  }

  list(filters = {}) {
    return this.records.filter(record => {
      if (filters.type && record.type !== filters.type) return false;
      if (filters.layer && record.layer !== filters.layer) return false;
      if (filters.key && record.key !== filters.key) return false;
      if (filters.outcome && record.outcome !== filters.outcome) return false;
      return true;
    });
  }

  summarize() {
    return {
      total: this.records.length,
      byType: this._countBy('type'),
      byLayer: this._countBy('layer'),
      byOutcome: this._countBy('outcome'),
    };
  }

  _countBy(field) {
    return this.records.reduce((acc, record) => {
      const key = record[field] || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = { MemoryProvenanceLedger };
