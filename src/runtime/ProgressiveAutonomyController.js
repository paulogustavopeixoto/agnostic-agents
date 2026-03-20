const { AutonomyEnvelope } = require('./AutonomyEnvelope');

class ProgressiveAutonomyController {
  constructor({
    minimumEvidenceScore = 0.6,
    widenIncrement = { spend: 1, toolCalls: 1, tokens: 250 },
    tightenIncrement = { spend: 1, toolCalls: 1, tokens: 250 },
    reviewThresholdDelta = 0.05,
    escalateThresholdDelta = 0.05,
  } = {}) {
    this.minimumEvidenceScore = minimumEvidenceScore;
    this.widenIncrement = { ...widenIncrement };
    this.tightenIncrement = { ...tightenIncrement };
    this.reviewThresholdDelta = reviewThresholdDelta;
    this.escalateThresholdDelta = escalateThresholdDelta;
  }

  adjust(envelope, { evidenceScore = 0, environment = null, tenant = null, reason = null } = {}) {
    const resolvedEnvelope = envelope instanceof AutonomyEnvelope ? envelope : new AutonomyEnvelope(envelope || {});
    const shouldWiden = evidenceScore >= this.minimumEvidenceScore;

    const limits = { ...resolvedEnvelope.budget.limits };
    const thresholds = {
      reviewThreshold: resolvedEnvelope.supervisionPolicy.reviewThreshold,
      escalateThreshold: resolvedEnvelope.supervisionPolicy.escalateThreshold,
    };

    for (const [metric, delta] of Object.entries(shouldWiden ? this.widenIncrement : this.tightenIncrement)) {
      if (typeof limits[metric] !== 'number') {
        continue;
      }
      limits[metric] = shouldWiden ? limits[metric] + delta : Math.max(0, limits[metric] - delta);
    }

    if (shouldWiden) {
      thresholds.reviewThreshold = Math.max(0, thresholds.reviewThreshold - this.reviewThresholdDelta);
      thresholds.escalateThreshold = Math.max(0, thresholds.escalateThreshold - this.escalateThresholdDelta);
    } else {
      thresholds.reviewThreshold = Math.min(1, thresholds.reviewThreshold + this.reviewThresholdDelta);
      thresholds.escalateThreshold = Math.min(1, thresholds.escalateThreshold + this.escalateThresholdDelta);
    }

    const updatedEnvelope = new AutonomyEnvelope({
      budget: {
        ...limits,
        metadata: {
          ...resolvedEnvelope.budget.metadata,
          adjustedByEvidence: evidenceScore,
          environment,
          tenant,
          reason,
        },
      },
      supervisionPolicy: {
        reviewThreshold: thresholds.reviewThreshold,
        escalateThreshold: thresholds.escalateThreshold,
        fallbackAction: resolvedEnvelope.supervisionPolicy.fallbackAction,
        metadata: {
          environment,
          tenant,
          reason,
        },
      },
      environment: resolvedEnvelope.environment || environment,
      tenant: resolvedEnvelope.tenant || tenant,
      metadata: {
        ...resolvedEnvelope.metadata,
        evidenceScore,
        adjustedAt: new Date().toISOString(),
        reason,
      },
    });

    return {
      action: shouldWiden ? 'widen' : 'tighten',
      evidenceScore,
      envelope: updatedEnvelope,
      summary: {
        environment: updatedEnvelope.environment || null,
        tenant: updatedEnvelope.tenant || null,
        limits: { ...updatedEnvelope.budget.limits },
        thresholds,
      },
    };
  }
}

module.exports = { ProgressiveAutonomyController };
