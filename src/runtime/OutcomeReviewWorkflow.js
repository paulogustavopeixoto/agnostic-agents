const { WorkflowOutcomeContract } = require('./WorkflowOutcomeContract');

class OutcomeReviewWorkflow {
  review({
    contract = null,
    experiment = null,
    tradeoff = null,
  } = {}) {
    const resolvedContract = contract instanceof WorkflowOutcomeContract
      ? contract
      : new WorkflowOutcomeContract(contract || {});

    const evaluation = resolvedContract.evaluate({
      businessOutcomeMet: (experiment?.deltas?.business || 0) >= (experiment?.thresholds?.minBusinessDelta || 0),
      serviceOutcomeMet: (experiment?.deltas?.service || 0) >= (experiment?.thresholds?.minServiceDelta || 0),
      overallScore: tradeoff?.weightedDelta ?? 0,
    });

    return {
      contract: resolvedContract.toJSON(),
      evaluation,
      experiment,
      tradeoff,
      recommendation:
        evaluation.passed && experiment?.decision === 'promote_candidate' && tradeoff?.recommendation === 'candidate_favored'
          ? 'approve_optimization'
          : 'hold_for_operator_review',
      operatorReviewPoints: [...resolvedContract.operatorReviewPoints],
    };
  }
}

module.exports = { OutcomeReviewWorkflow };
