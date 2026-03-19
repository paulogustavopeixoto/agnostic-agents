/**
 * Maintains lightweight trust scores for critics, verifiers, and other
 * coordination actors so disagreement resolution can weight historical quality.
 */
class TrustRegistry {
  /**
   * @param {object} [options]
   * @param {Array<object>} [options.records]
   */
  constructor({ records = [] } = {}) {
    this.records = Array.isArray(records) ? [...records] : [];
  }

  /**
   * Record an observed outcome for a coordination actor.
   *
   * @param {object} outcome
   * @returns {object}
   */
  recordOutcome(outcome = {}) {
    const retries =
      typeof outcome.retries === 'number' && Number.isFinite(outcome.retries)
        ? Math.max(0, outcome.retries)
        : 0;
    const recoverySucceeded =
      typeof outcome.recoverySucceeded === 'boolean' ? outcome.recoverySucceeded : null;
    const role = outcome.role || outcome.metadata?.role || null;
    const taskFamily = outcome.taskFamily || outcome.metadata?.taskFamily || null;
    const outcomeType = outcome.outcomeType || outcome.metadata?.outcomeType || 'direct';
    const explicitWeight =
      typeof outcome.weight === 'number' && Number.isFinite(outcome.weight) ? outcome.weight : null;
    const entry = {
      actorId: outcome.actorId || 'unknown_actor',
      domain: outcome.domain || 'general',
      success: outcome.success !== false,
      confidence: typeof outcome.confidence === 'number' ? outcome.confidence : null,
      role,
      taskFamily,
      outcomeType,
      retries,
      recoverySucceeded,
      weight: Number(
        (
          explicitWeight ??
          this._calculateWeight({
            success: outcome.success !== false,
            confidence: typeof outcome.confidence === 'number' ? outcome.confidence : null,
            outcomeType,
            retries,
            recoverySucceeded,
          })
        ).toFixed(3)
      ),
      metadata: outcome.metadata || {},
    };
    this.records.push(entry);
    return entry;
  }

  /**
   * Compute a bounded trust score.
   *
   * @param {string} actorId
   * @param {object} [options]
   * @param {string|null} [options.domain]
   * @returns {number}
   */
  getScore(actorId, { domain = null, taskFamily = null, role = null } = {}) {
    const exact = this._filterRecords(actorId, { domain, taskFamily, role });
    const byTaskFamily = taskFamily ? this._filterRecords(actorId, { taskFamily, role }) : [];
    const byDomain = domain ? this._filterRecords(actorId, { domain, role }) : [];
    const byRole = role ? this._filterRecords(actorId, { role }) : [];
    const relevant =
      exact.length ? exact : byTaskFamily.length ? byTaskFamily : byDomain.length ? byDomain : byRole;

    if (!relevant.length) {
      return 0.5;
    }

    const totalWeight = relevant.reduce((sum, record) => sum + (record.weight || 1), 0) || relevant.length;
    const weightedSuccess = relevant.reduce(
      (sum, record) => sum + (record.success ? 1 : 0) * (record.weight || 1),
      0
    );
    const successRate = weightedSuccess / totalWeight;
    const confidenceValues = relevant
      .map(record => record.confidence)
      .filter(value => typeof value === 'number');
    const confidenceWeight = confidenceValues.length
      ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
      : 0.5;
    const recoveryValues = relevant
      .filter(record => typeof record.recoverySucceeded === 'boolean')
      .map(record => (record.recoverySucceeded ? 1 : 0));
    const recoveryWeight = recoveryValues.length
      ? recoveryValues.reduce((sum, value) => sum + value, 0) / recoveryValues.length
      : 0.5;

    return Number((successRate * 0.6 + confidenceWeight * 0.2 + recoveryWeight * 0.2).toFixed(3));
  }

  /**
   * Rank actors by trust score.
   *
   * @param {Array<string>} actorIds
   * @param {object} [options]
   * @param {string|null} [options.domain]
   * @returns {Array<object>}
   */
  rankActors(actorIds = [], { domain = null, taskFamily = null, role = null } = {}) {
    return [...actorIds]
      .map(actorId => ({
        actorId,
        score: this.getScore(actorId, { domain, taskFamily, role }),
      }))
      .sort((left, right) => right.score - left.score);
  }

  summarize() {
    const actors = [...new Set(this.records.map(record => record.actorId))];
    return {
      totalRecords: this.records.length,
      actors: this.rankActors(actors),
      byRole: this._summarizeByField('role'),
      byTaskFamily: this._summarizeByField('taskFamily'),
      byOutcomeType: this._summarizeByField('outcomeType'),
    };
  }

  getProfile(actorId) {
    return {
      actorId,
      totalRecords: this.records.filter(record => record.actorId === actorId).length,
      overallScore: this.getScore(actorId),
      byRole: this._buildActorBreakdown(actorId, 'role'),
      byTaskFamily: this._buildActorBreakdown(actorId, 'taskFamily'),
      byDomain: this._buildActorBreakdown(actorId, 'domain'),
    };
  }

  _filterRecords(actorId, { domain = null, taskFamily = null, role = null } = {}) {
    return this.records.filter(
      record =>
        record.actorId === actorId &&
        (!domain || record.domain === domain) &&
        (!taskFamily || record.taskFamily === taskFamily) &&
        (!role || record.role === role)
    );
  }

  _calculateWeight({ confidence = null, outcomeType = 'direct', retries = 0, recoverySucceeded = null } = {}) {
    const confidenceWeight = typeof confidence === 'number' ? 0.5 + confidence * 0.5 : 0.75;
    const outcomeWeight =
      {
        direct: 1,
        retry: 0.85,
        recovery: 1.1,
        escalation: 0.95,
      }[outcomeType] || 1;
    const retryPenalty = Math.max(0.6, 1 - retries * 0.08);
    const recoveryWeight =
      recoverySucceeded === null ? 1 : recoverySucceeded ? 1.05 : 0.75;

    return confidenceWeight * outcomeWeight * retryPenalty * recoveryWeight;
  }

  _summarizeByField(field) {
    const groups = [...new Set(this.records.map(record => record[field]).filter(Boolean))];
    return groups.map(value => ({
      [field]: value,
      totalRecords: this.records.filter(record => record[field] === value).length,
    }));
  }

  _buildActorBreakdown(actorId, field) {
    const values = [
      ...new Set(
        this.records
          .filter(record => record.actorId === actorId)
          .map(record => record[field])
          .filter(Boolean)
      ),
    ];

    return values.map(value => ({
      [field]: value,
      score:
        field === 'role'
          ? this.getScore(actorId, { role: value })
          : field === 'taskFamily'
            ? this.getScore(actorId, { taskFamily: value })
            : this.getScore(actorId, { domain: value }),
    }));
  }
}

module.exports = { TrustRegistry };
