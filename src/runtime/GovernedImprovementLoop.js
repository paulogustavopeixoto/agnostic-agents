const { ImprovementProposalEngine } = require('./ImprovementProposalEngine');
const { AdaptiveGovernanceGate } = require('./AdaptiveGovernanceGate');
const { AdaptiveDecisionLedger } = require('./AdaptiveDecisionLedger');
const { LearnedAdaptationArtifact } = require('./LearnedAdaptationArtifact');
const { AdaptationPolicyEnvelope } = require('./AdaptationPolicyEnvelope');
const { ImprovementEffectTracker } = require('./ImprovementEffectTracker');
const { ImprovementActionPlanner } = require('./ImprovementActionPlanner');

class GovernedImprovementLoop {
  constructor({
    proposalEngine = null,
    governanceGate = null,
    ledger = null,
    adaptationEnvelope = null,
    effectTracker = null,
    actionPlanner = null,
  } = {}) {
    this.ledger =
      ledger instanceof AdaptiveDecisionLedger ? ledger : new AdaptiveDecisionLedger(ledger || {});
    this.proposalEngine =
      proposalEngine instanceof ImprovementProposalEngine
        ? proposalEngine
        : proposalEngine && typeof proposalEngine.buildProposals === 'function'
          ? proposalEngine
        : new ImprovementProposalEngine(proposalEngine || {});
    this.governanceGate =
      governanceGate instanceof AdaptiveGovernanceGate
        ? governanceGate
        : new AdaptiveGovernanceGate({
            ...(governanceGate || {}),
            ledger: this.ledger,
          });
    this.adaptationEnvelope =
      adaptationEnvelope instanceof AdaptationPolicyEnvelope
        ? adaptationEnvelope
        : new AdaptationPolicyEnvelope(adaptationEnvelope || {});
    this.effectTracker =
      effectTracker instanceof ImprovementEffectTracker
        ? effectTracker
        : new ImprovementEffectTracker(effectTracker || {});
    this.actionPlanner =
      actionPlanner instanceof ImprovementActionPlanner
        ? actionPlanner
        : new ImprovementActionPlanner(actionPlanner || {});
  }

  async propose(options = {}) {
    return this.proposalEngine.buildProposals(options).map(proposal =>
      new LearnedAdaptationArtifact({
        proposal,
        metadata: {
          source: 'governed_improvement_loop',
        },
      })
    );
  }

  async review(options = {}) {
    const artifacts = await this.propose(options);
    const reviews = [];

    for (const artifact of artifacts) {
      const envelopeDecision = this.adaptationEnvelope.evaluate(artifact.proposal);
      if (envelopeDecision.action === 'deny') {
        reviews.push({
          artifact: artifact.toJSON(),
          review: {
            action: 'deny',
            decision: {
              action: 'deny',
              reason: this.adaptationEnvelope.explain(artifact.proposal),
              source: 'adaptation_envelope',
            },
            envelope: envelopeDecision,
            request: null,
          },
        });
        continue;
      }

      const review = await this.governanceGate.reviewSuggestion(
        {
          id: artifact.proposal.id,
          category: artifact.proposal.category,
          priority: artifact.proposal.priority,
          suggestion: artifact.proposal.recommendedChange?.summary,
          reason: artifact.proposal.rationale,
          evidence: artifact.proposal.evidence,
          suggestedActions: artifact.proposal.recommendedChange?.actions || [],
        },
        {
          source: 'governed_improvement_loop',
          category: artifact.proposal.category,
          priority: artifact.proposal.priority,
          boundedBy: 'adaptation_policy_envelope',
          replay: {
            artifact: artifact.toJSON(),
          },
          rollback: artifact.proposal.rollback || null,
          envelope: envelopeDecision,
        }
      );

      reviews.push({
        artifact: artifact.toJSON(),
        review: {
          ...review,
          envelope: envelopeDecision,
        },
      });
    }

    return {
      total: reviews.length,
      reviews,
      ledger: this.ledger.summarize(),
    };
  }

  recordOutcome({ proposalId, baseline = {}, outcome = {}, summary = null, metadata = {} } = {}) {
    return this.effectTracker.record({
      proposalId,
      baseline,
      outcome,
      summary,
      metadata,
    });
  }

  summarizeEffects() {
    return this.effectTracker.summarize();
  }

  summarizeReview(review = {}) {
    const reviews = Array.isArray(review.reviews) ? review.reviews : [];
    const actions = reviews.reduce((summary, item) => {
      const action = item?.review?.action || 'unknown';
      summary[action] = (summary[action] || 0) + 1;
      return summary;
    }, {});

    return {
      total: review.total || reviews.length,
      actions,
      bounded: reviews.filter(item => item?.review?.envelope?.bounded === true).length,
      denied: actions.deny || 0,
      approvalRequired: actions.require_approval || 0,
      allowed: actions.allow || 0,
      effectSummary: this.summarizeEffects(),
    };
  }

  buildActionPlans(options = {}) {
    return this.actionPlanner.buildPlans(this.proposalEngine.buildProposals(options));
  }
}

module.exports = { GovernedImprovementLoop };
