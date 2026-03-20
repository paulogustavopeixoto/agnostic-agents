class MemoryAuditView {
  build({ audit = [] } = {}) {
    const entries = Array.isArray(audit) ? audit : [];
    return {
      total: entries.length,
      stored: entries.filter(entry => entry.type === 'write' && entry.outcome === 'stored').length,
      recalled: entries.filter(entry => entry.type === 'read' && entry.outcome === 'returned').length,
      transformed: entries.filter(entry => entry.type === 'transform').length,
      blocked: entries.filter(entry => entry.outcome === 'blocked').length,
      conflicts: entries.filter(entry => entry.type === 'conflict_detected').length,
      retentionActions: entries.filter(entry => entry.type === 'retention').length,
      byLayer: this._countBy(entries, 'layer'),
      byType: this._countBy(entries, 'type'),
      byActor: this._countBy(entries, 'actor'),
      recent: entries.slice(-5),
    };
  }

  _countBy(entries, field) {
    return entries.reduce((acc, entry) => {
      const key = entry[field] || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = { MemoryAuditView };
