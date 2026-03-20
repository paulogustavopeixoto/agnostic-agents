class UncertaintySupervisionPolicy {
  constructor({
    reviewThreshold = 0.65,
    escalateThreshold = 0.45,
    fallbackAction = 'safer_fallback',
  } = {}) {
    this.reviewThreshold = reviewThreshold;
    this.escalateThreshold = escalateThreshold;
    this.fallbackAction = fallbackAction;
  }

  evaluate({ confidence = null, uncertainty = null, riskClass = 'low' } = {}) {
    const normalizedConfidence =
      typeof confidence === 'number'
        ? confidence
        : typeof uncertainty === 'number'
          ? 1 - uncertainty
          : 1;

    if (normalizedConfidence < this.escalateThreshold) {
      return {
        action: 'escalate',
        reason: `Confidence ${normalizedConfidence} is below escalation threshold ${this.escalateThreshold}.`,
        fallbackAction: this.fallbackAction,
        riskClass,
      };
    }

    if (normalizedConfidence < this.reviewThreshold) {
      return {
        action: 'review',
        reason: `Confidence ${normalizedConfidence} is below review threshold ${this.reviewThreshold}.`,
        fallbackAction: this.fallbackAction,
        riskClass,
      };
    }

    return {
      action: 'allow',
      reason: null,
      fallbackAction: null,
      riskClass,
    };
  }
}

module.exports = { UncertaintySupervisionPolicy };
