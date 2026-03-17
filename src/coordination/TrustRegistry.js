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
    const entry = {
      actorId: outcome.actorId || 'unknown_actor',
      domain: outcome.domain || 'general',
      success: outcome.success !== false,
      confidence: typeof outcome.confidence === 'number' ? outcome.confidence : null,
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
  getScore(actorId, { domain = null } = {}) {
    const relevant = this.records.filter(
      record => record.actorId === actorId && (!domain || record.domain === domain)
    );

    if (!relevant.length) {
      return 0.5;
    }

    const successes = relevant.filter(record => record.success).length;
    const successRate = successes / relevant.length;
    const confidenceValues = relevant
      .map(record => record.confidence)
      .filter(value => typeof value === 'number');
    const confidenceWeight = confidenceValues.length
      ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
      : 0.5;

    return Number((successRate * 0.7 + confidenceWeight * 0.3).toFixed(3));
  }

  /**
   * Rank actors by trust score.
   *
   * @param {Array<string>} actorIds
   * @param {object} [options]
   * @param {string|null} [options.domain]
   * @returns {Array<object>}
   */
  rankActors(actorIds = [], { domain = null } = {}) {
    return [...actorIds]
      .map(actorId => ({
        actorId,
        score: this.getScore(actorId, { domain }),
      }))
      .sort((left, right) => right.score - left.score);
  }

  summarize() {
    const actors = [...new Set(this.records.map(record => record.actorId))];
    return {
      totalRecords: this.records.length,
      actors: this.rankActors(actors),
    };
  }
}

module.exports = { TrustRegistry };
