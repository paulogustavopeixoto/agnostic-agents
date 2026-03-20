class AutonomyBudgetLedger {
  constructor({ entries = [] } = {}) {
    this.entries = Array.isArray(entries) ? [...entries] : [];
  }

  record(entry = {}) {
    const normalized = {
      id: entry.id || `budget-entry-${this.entries.length + 1}`,
      runId: entry.runId || null,
      action: entry.action || 'record',
      snapshot: entry.snapshot || null,
      timestamp: entry.timestamp || new Date().toISOString(),
      metadata: entry.metadata || {},
    };
    this.entries.push(normalized);
    return normalized;
  }

  list(filters = {}) {
    return this.entries.filter(entry => {
      if (filters.runId && entry.runId !== filters.runId) return false;
      if (filters.action && entry.action !== filters.action) return false;
      return true;
    });
  }

  summarize() {
    return {
      total: this.entries.length,
      exhausted: this.entries.filter(entry => entry.snapshot?.exhausted).length,
      byAction: this.entries.reduce((acc, entry) => {
        acc[entry.action] = (acc[entry.action] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}

module.exports = { AutonomyBudgetLedger };
