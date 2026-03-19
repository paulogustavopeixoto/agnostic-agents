class GovernanceRecordLedger {
  constructor({ records = [] } = {}) {
    this.records = Array.isArray(records) ? [...records] : [];
  }

  record(entry = {}) {
    const record = {
      id: entry.id || `governance-record:${this.records.length + 1}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      surface: entry.surface || 'runtime',
      action: entry.action || 'observe',
      correlationId: entry.correlationId || null,
      runId: entry.runId || null,
      candidateId: entry.candidateId || null,
      actorId: entry.actorId || null,
      status: entry.status || null,
      summary: entry.summary || null,
      metadata: entry.metadata || {},
    };

    this.records.push(record);
    return record;
  }

  list(filters = {}) {
    return this.records.filter(record => {
      if (filters.surface && record.surface !== filters.surface) {
        return false;
      }
      if (filters.correlationId && record.correlationId !== filters.correlationId) {
        return false;
      }
      if (filters.candidateId && record.candidateId !== filters.candidateId) {
        return false;
      }
      if (filters.runId && record.runId !== filters.runId) {
        return false;
      }
      return true;
    });
  }

  summarize() {
    const bySurface = this.records.reduce((accumulator, record) => {
      accumulator[record.surface] = (accumulator[record.surface] || 0) + 1;
      return accumulator;
    }, {});

    const byAction = this.records.reduce((accumulator, record) => {
      accumulator[record.action] = (accumulator[record.action] || 0) + 1;
      return accumulator;
    }, {});

    return {
      total: this.records.length,
      bySurface,
      byAction,
      correlations: [...new Set(this.records.map(record => record.correlationId).filter(Boolean))],
    };
  }
}

module.exports = { GovernanceRecordLedger };
