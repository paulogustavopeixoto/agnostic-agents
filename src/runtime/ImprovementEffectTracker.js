class ImprovementEffectTracker {
  constructor({ records = [] } = {}) {
    this.records = Array.isArray(records) ? [...records] : [];
  }

  record(record = {}) {
    const normalized = {
      proposalId: record.proposalId || record.id || `effect:${this.records.length + 1}`,
      appliedAt: record.appliedAt || new Date().toISOString(),
      baseline: record.baseline || {},
      outcome: record.outcome || {},
      delta: this._computeDelta(record.baseline || {}, record.outcome || {}),
      summary: record.summary || null,
      metadata: record.metadata || {},
    };

    this.records.push(normalized);
    return normalized;
  }

  summarize() {
    const improved = this.records.filter(record => record.delta.improved === true).length;
    const regressed = this.records.filter(record => record.delta.regressed === true).length;

    return {
      total: this.records.length,
      improved,
      regressed,
      netPositive: improved >= regressed,
    };
  }

  explain(record = {}) {
    const baselineConfidence = record.baseline?.averageConfidence;
    const outcomeConfidence = record.outcome?.averageConfidence;
    const baselineFailures = record.baseline?.failedEvaluations;
    const outcomeFailures = record.outcome?.failedEvaluations;

    return {
      proposalId: record.proposalId || null,
      confidenceChange:
        typeof baselineConfidence === 'number' && typeof outcomeConfidence === 'number'
          ? Number((outcomeConfidence - baselineConfidence).toFixed(2))
          : null,
      failureChange:
        typeof baselineFailures === 'number' && typeof outcomeFailures === 'number'
          ? outcomeFailures - baselineFailures
          : null,
      improved: record.delta?.improved === true,
      regressed: record.delta?.regressed === true,
    };
  }

  _computeDelta(baseline = {}, outcome = {}) {
    const baselineConfidence = typeof baseline.averageConfidence === 'number' ? baseline.averageConfidence : null;
    const outcomeConfidence = typeof outcome.averageConfidence === 'number' ? outcome.averageConfidence : null;
    const baselineFailures = typeof baseline.failedEvaluations === 'number' ? baseline.failedEvaluations : null;
    const outcomeFailures = typeof outcome.failedEvaluations === 'number' ? outcome.failedEvaluations : null;

    const confidenceDelta =
      baselineConfidence !== null && outcomeConfidence !== null
        ? Number((outcomeConfidence - baselineConfidence).toFixed(2))
        : null;
    const failureDelta =
      baselineFailures !== null && outcomeFailures !== null ? outcomeFailures - baselineFailures : null;

    const improved =
      (confidenceDelta !== null && confidenceDelta > 0) || (failureDelta !== null && failureDelta < 0);
    const regressed =
      (confidenceDelta !== null && confidenceDelta < 0) || (failureDelta !== null && failureDelta > 0);

    return {
      confidenceDelta,
      failureDelta,
      improved,
      regressed,
    };
  }
}

module.exports = { ImprovementEffectTracker };
