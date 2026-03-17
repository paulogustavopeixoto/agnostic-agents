const fs = require('fs/promises');
const path = require('path');

/**
 * Records adaptive suggestions and applied decisions with enough metadata to
 * review, replay, and roll back them later.
 */
class AdaptiveDecisionLedger {
  /**
   * @param {object} [options]
   * @param {Array<object>} [options.entries]
   * @param {string|null} [options.filePath]
   */
  constructor({ entries = [], filePath = null } = {}) {
    this.entries = Array.isArray(entries) ? [...entries] : [];
    this.filePath = filePath || null;
  }

  async record(entry = {}) {
    const normalized = {
      id: entry.id || `adaptive:${this.entries.length + 1}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      type: entry.type || 'suggestion',
      category: entry.category || 'general',
      source: entry.source || 'runtime',
      summary: entry.summary || null,
      evidence: entry.evidence || {},
      recommendation: entry.recommendation || null,
      decision: entry.decision || null,
      replay: entry.replay || null,
      rollback: entry.rollback || null,
      approved: entry.approved === true,
      applied: entry.applied === true,
      metadata: entry.metadata || {},
    };

    this.entries.push(normalized);
    await this._persist(normalized);
    return normalized;
  }

  async recordSuggestion(suggestion = {}, metadata = {}) {
    return this.record({
      id: suggestion.id || metadata.id || null,
      type: 'suggestion',
      category: suggestion.category || metadata.category || 'general',
      source: metadata.source || 'adaptive_advisor',
      summary: suggestion.suggestion || suggestion.summary || null,
      evidence: suggestion.evidence || {},
      recommendation: suggestion,
      replay: metadata.replay || null,
      rollback: metadata.rollback || null,
      metadata,
    });
  }

  async recordDecision(decision = {}, metadata = {}) {
    return this.record({
      id: decision.id || metadata.id || null,
      type: 'decision',
      category: decision.category || metadata.category || 'general',
      source: metadata.source || 'adaptive_runtime',
      summary: decision.summary || decision.reason || null,
      evidence: decision.evidence || {},
      decision,
      replay: metadata.replay || null,
      rollback: metadata.rollback || null,
      approved: metadata.approved === true,
      applied: metadata.applied === true,
      metadata,
    });
  }

  get(entryId) {
    return this.entries.find(entry => entry.id === entryId) || null;
  }

  list() {
    return [...this.entries];
  }

  summarize() {
    return {
      total: this.entries.length,
      suggestions: this.entries.filter(entry => entry.type === 'suggestion').length,
      decisions: this.entries.filter(entry => entry.type === 'decision').length,
      applied: this.entries.filter(entry => entry.applied === true).length,
      approved: this.entries.filter(entry => entry.approved === true).length,
      replayable: this.entries.filter(entry => Boolean(entry.replay)).length,
      rollbackReady: this.entries.filter(entry => Boolean(entry.rollback)).length,
    };
  }

  exportReplay(entryId) {
    const entry = this.get(entryId);
    if (!entry) {
      throw new Error(`Adaptive ledger entry "${entryId}" not found.`);
    }

    return {
      entryId: entry.id,
      type: entry.type,
      replay: entry.replay || null,
      evidence: entry.evidence || {},
      metadata: entry.metadata || {},
    };
  }

  buildRollbackPlan(entryId) {
    const entry = this.get(entryId);
    if (!entry) {
      throw new Error(`Adaptive ledger entry "${entryId}" not found.`);
    }

    return {
      entryId: entry.id,
      summary: entry.summary,
      rollback: entry.rollback || {
        action: 'manual_review',
        reason: 'No explicit rollback metadata was recorded for this adaptive change.',
      },
      replay: entry.replay || null,
    };
  }

  async _persist(entry) {
    if (!this.filePath) {
      return;
    }

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.appendFile(this.filePath, `${JSON.stringify(entry)}\n`, 'utf8');
  }
}

module.exports = { AdaptiveDecisionLedger };
