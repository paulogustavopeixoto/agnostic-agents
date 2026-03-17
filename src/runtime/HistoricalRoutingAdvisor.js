const { LearningLoop } = require('./LearningLoop');

/**
 * Maintains lightweight provider outcome history and uses it to rank routing
 * candidates for future calls.
 */
class HistoricalRoutingAdvisor {
  /**
   * @param {object} [options]
   * @param {LearningLoop|null} [options.learningLoop]
   * @param {Array<object>} [options.outcomes]
   */
  constructor({ learningLoop = null, outcomes = [] } = {}) {
    this.learningLoop = learningLoop instanceof LearningLoop ? learningLoop : learningLoop;
    this.outcomes = Array.isArray(outcomes) ? [...outcomes] : [];
  }

  recordOutcome(outcome = {}) {
    const entry = {
      providerLabel: outcome.providerLabel || 'unknown',
      success: outcome.success !== false,
      methodName: outcome.methodName || 'generateText',
      taskType: outcome.taskType || null,
      confidence: typeof outcome.confidence === 'number' ? outcome.confidence : null,
      error: outcome.error || null,
    };
    this.outcomes.push(entry);
    return entry;
  }

  rankProviders(providers = [], { methodName = 'generateText', args = [] } = {}) {
    const [, config = {}] = args;
    const route = config.route || {};
    const routeHints = route.hints || {};
    const taskType = routeHints.taskType || route.taskType || null;
    const learningSummary = this.learningLoop?.summarize ? this.learningLoop.summarize() : {};

    const scoreProvider = entry => {
      const label = this._providerLabel(entry);
      const relevant = this.outcomes.filter(
        outcome =>
          outcome.providerLabel === label &&
          outcome.methodName === methodName &&
          (!taskType || outcome.taskType === taskType)
      );
      const successes = relevant.filter(outcome => outcome.success).length;
      const successRate = relevant.length ? successes / relevant.length : 0.5;
      const confidenceValues = relevant
        .map(outcome => outcome.confidence)
        .filter(value => typeof value === 'number');
      const averageConfidence = confidenceValues.length
        ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
        : 0.5;

      let score = successRate * 6 + averageConfidence * 4;

      if (taskType && entry.profile?.taskTypes?.includes(taskType)) {
        score += 3;
      }

      if ((learningSummary.lowConfidenceRuns || 0) > 0 && entry.profile?.riskTier === 'high') {
        score += 1;
      }

      return score;
    };

    return [...providers].sort((left, right) => scoreProvider(right) - scoreProvider(left));
  }

  _providerLabel(entry = {}) {
    return (
      entry.profile?.labels?.[0] ||
      entry.provider?.name ||
      entry.provider?.constructor?.name ||
      'unknown'
    );
  }
}

module.exports = { HistoricalRoutingAdvisor };
