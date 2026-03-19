const { ImprovementProposalEngine } = require('./ImprovementProposalEngine');
const { AdaptiveGovernanceGate } = require('./AdaptiveGovernanceGate');
const { AdaptiveDecisionLedger } = require('./AdaptiveDecisionLedger');
const { LearnedAdaptationArtifact } = require('./LearnedAdaptationArtifact');

class GovernedImprovementLoop {
  constructor({
    proposalEngine = null,
    governanceGate = null,
    ledger = null,
  } = {}) {
    this.ledger =
      ledger instanceof AdaptiveDecisionLedger ? ledger : new AdaptiveDecisionLedger(ledger || {});
    this.proposalEngine =
      proposalEngine instanceof ImprovementProposalEngine
        ? proposalEngine
        : new ImprovementProposalEngine(proposalEngine || {});
    this.governanceGate =
      governanceGate instanceof AdaptiveGovernanceGate
        ? governanceGate
        : new AdaptiveGovernanceGate({
            ...(governanceGate || {}),
            ledger: this.ledger,
          });
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
          replay: {
            artifact: artifact.toJSON(),
          },
          rollback: artifact.proposal.rollback || null,
        }
      );

      reviews.push({
        artifact: artifact.toJSON(),
        review,
      });
    }

    return {
      total: reviews.length,
      reviews,
      ledger: this.ledger.summarize(),
    };
  }
}

module.exports = { GovernedImprovementLoop };
