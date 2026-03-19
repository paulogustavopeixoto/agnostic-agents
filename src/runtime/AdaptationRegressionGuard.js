const { ImprovementEffectTracker } = require('./ImprovementEffectTracker');

class AdaptationRegressionGuard {
  constructor({
    effectTracker = null,
    maxRegressions = 0,
    minConfidenceDelta = -0.05,
    maxFailureDelta = 0,
  } = {}) {
    this.effectTracker =
      effectTracker instanceof ImprovementEffectTracker
        ? effectTracker
        : new ImprovementEffectTracker(effectTracker || {});
    this.maxRegressions = maxRegressions;
    this.minConfidenceDelta = minConfidenceDelta;
    this.maxFailureDelta = maxFailureDelta;
  }

  evaluate(records = null) {
    const effects = Array.isArray(records) ? records : this.effectTracker.records;
    const regressions = [];

    for (const record of effects) {
      const delta = record?.delta || {};
      const failed =
        delta.regressed === true ||
        (typeof delta.confidenceDelta === 'number' && delta.confidenceDelta < this.minConfidenceDelta) ||
        (typeof delta.failureDelta === 'number' && delta.failureDelta > this.maxFailureDelta);

      if (failed) {
        regressions.push({
          proposalId: record.proposalId || null,
          delta,
          summary: record.summary || null,
        });
      }
    }

    return {
      action: regressions.length > this.maxRegressions ? 'halt_adaptation' : 'allow',
      regressions,
      totalEffects: effects.length,
      maxRegressions: this.maxRegressions,
    };
  }
}

module.exports = { AdaptationRegressionGuard };
