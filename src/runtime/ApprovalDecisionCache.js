class ApprovalDecisionCache {
  constructor({ entries = [] } = {}) {
    this.entries = new Map();

    for (const entry of entries) {
      const normalized = this._normalizeEntry(entry);
      this.entries.set(normalized.id, normalized);
    }
  }

  cache(entry = {}) {
    const normalized = this._normalizeEntry(entry);
    this.entries.set(normalized.id, normalized);
    return normalized;
  }

  find(request = {}) {
    for (const entry of this.entries.values()) {
      if (entry.revokedAt) {
        continue;
      }
      if (this._matches(entry, request)) {
        return entry;
      }
    }
    return null;
  }

  revoke(id, { reason = 'revoked', revokedBy = null } = {}) {
    const entry = this.entries.get(id);
    if (!entry) {
      return null;
    }
    entry.revokedAt = new Date().toISOString();
    entry.revocation = {
      reason,
      revokedBy,
    };
    return entry;
  }

  list() {
    return [...this.entries.values()].map(entry => ({ ...entry }));
  }

  summarize() {
    const values = [...this.entries.values()];
    return {
      total: values.length,
      active: values.filter(entry => !entry.revokedAt).length,
      revoked: values.filter(entry => Boolean(entry.revokedAt)).length,
    };
  }

  _normalizeEntry(entry = {}) {
    if (!entry.id) {
      throw new Error('ApprovalDecisionCache requires entry.id.');
    }
    return {
      id: entry.id,
      action: entry.action || null,
      toolName: entry.toolName || null,
      environment: entry.environment || null,
      tenant: entry.tenant || null,
      approver: entry.approver || null,
      decision: entry.decision || 'approved',
      reusable: entry.reusable !== false,
      metadata: entry.metadata || {},
      revokedAt: entry.revokedAt || null,
      revocation: entry.revocation || null,
    };
  }

  _matches(entry, request) {
    if (entry.action && request.action && entry.action !== request.action) return false;
    if (entry.toolName && request.toolName && entry.toolName !== request.toolName) return false;
    if (entry.environment && request.environment && entry.environment !== request.environment) return false;
    if (entry.tenant && request.tenant && entry.tenant !== request.tenant) return false;
    return true;
  }
}

module.exports = { ApprovalDecisionCache };
