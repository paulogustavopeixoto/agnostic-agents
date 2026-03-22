class OutcomeOptimizationExperiment {
  static build({
    id = 'outcome-experiment',
    baseline = {},
    candidate = {},
    thresholds = {},
  } = {}) {
    const success = {
      minBusinessDelta: thresholds.minBusinessDelta ?? 0,
      minServiceDelta: thresholds.minServiceDelta ?? 0,
      maxSafetyRegression: thresholds.maxSafetyRegression ?? 0,
    };

    const businessDelta = (candidate.business || 0) - (baseline.business || 0);
    const serviceDelta = (candidate.service || 0) - (baseline.service || 0);
    const safetyDelta = (candidate.safety || 0) - (baseline.safety || 0);

    const rollbackRequired =
      businessDelta < success.minBusinessDelta ||
      serviceDelta < success.minServiceDelta ||
      safetyDelta < -success.maxSafetyRegression;

    return {
      kind: 'agnostic-agents/outcome-optimization-experiment',
      version: '1.0.0',
      id,
      baseline,
      candidate,
      thresholds: success,
      deltas: {
        business: Number(businessDelta.toFixed(2)),
        service: Number(serviceDelta.toFixed(2)),
        safety: Number(safetyDelta.toFixed(2)),
      },
      decision: rollbackRequired ? 'rollback_candidate' : 'promote_candidate',
    };
  }
}

module.exports = { OutcomeOptimizationExperiment };
