class WorkflowSupervisionCheckpoint {
  constructor({
    requireReviewBelowConfidence = 0.7,
    escalateBelowConfidence = 0.5,
    metadata = {},
  } = {}) {
    this.requireReviewBelowConfidence = requireReviewBelowConfidence;
    this.escalateBelowConfidence = escalateBelowConfidence;
    this.metadata = metadata;
  }

  evaluate({
    workflowId = null,
    stepId = null,
    taskFamily = null,
    riskClass = 'low',
    confidence = 1,
    rationale = '',
    alternatives = [],
    context = {},
  } = {}) {
    let action = 'allow';
    if (confidence < this.escalateBelowConfidence) {
      action = 'escalate';
    } else if (confidence < this.requireReviewBelowConfidence) {
      action = 'review';
    }

    return {
      action,
      requiresPause: action !== 'allow',
      checkpoint: {
        workflowId,
        stepId,
        taskFamily,
        riskClass,
        confidence,
        rationale,
        alternatives: Array.isArray(alternatives) ? [...alternatives] : [],
        metadata: {
          ...this.metadata,
          ...context,
        },
      },
    };
  }
}

module.exports = { WorkflowSupervisionCheckpoint };
