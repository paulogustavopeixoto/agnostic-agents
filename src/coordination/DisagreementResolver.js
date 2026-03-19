const { TrustRegistry } = require('./TrustRegistry');

/**
 * Resolves structured critiques into an explicit next action instead of
 * leaving coordination outcomes implicit inside free-form model text.
 */
class DisagreementResolver {
  /**
   * @param {object} [options]
   * @param {TrustRegistry|null} [options.trustRegistry]
   * @param {boolean} [options.escalateOnDisagreement]
   */
  constructor({
    trustRegistry = null,
    escalateOnDisagreement = true,
    strategy = 'weighted_impact',
    trustThreshold = 0.75,
  } = {}) {
    this.trustRegistry =
      trustRegistry instanceof TrustRegistry ? trustRegistry : trustRegistry ? new TrustRegistry(trustRegistry) : null;
    this.escalateOnDisagreement = escalateOnDisagreement !== false;
    this.strategy = strategy || 'weighted_impact';
    this.trustThreshold = typeof trustThreshold === 'number' ? trustThreshold : 0.75;
  }

  /**
   * Resolve a set of critiques into one explicit coordination action.
   *
   * @param {Array<object>} critiques
   * @param {object} [context]
   * @returns {object}
   */
  resolve(critiques = [], context = {}) {
    if (!Array.isArray(critiques) || !critiques.length) {
      return {
        action: 'accept',
        reason: 'No critiques were produced.',
        disagreement: false,
        rankedCritiques: [],
        summary: {},
      };
    }

    const weighted = critiques.map(critique => {
      const trust = this.trustRegistry?.getScore(critique.criticId, {
        domain: context.domain || critique.failureType || null,
        taskFamily: context.taskFamily || critique.metadata?.taskFamily || null,
        role: critique.metadata?.role || 'critic',
      }) || 0.5;
      const severityWeight = {
        low: 0.25,
        medium: 0.5,
        high: 0.8,
        critical: 1,
      }[critique.severity || 'medium'];
      const verdictWeight = {
        accept: 1,
        revise: -0.35,
        reject: -0.8,
        escalate: -1,
      }[critique.verdict || 'revise'];

      return {
        ...critique,
        trust,
        weightedImpact: Number((verdictWeight * (critique.confidence || 0.5) * (0.5 + trust) * (0.5 + severityWeight)).toFixed(3)),
      };
    });

    const rankedCritiques = [...weighted].sort((left, right) => {
      return Math.abs(right.weightedImpact) - Math.abs(left.weightedImpact);
    });

    const verdicts = new Set(weighted.map(item => item.verdict));
    const disagreement = verdicts.size > 1;
    const totalImpact = weighted.reduce((sum, critique) => sum + critique.weightedImpact, 0);
    const hasCritical = weighted.some(critique => critique.severity === 'critical');
    const hasEscalation = weighted.some(
      critique => critique.verdict === 'escalate' || critique.recommendedAction === 'escalate'
    );
    const hasRejection = weighted.some(critique => critique.verdict === 'reject');
    const branchWorthy = weighted.some(critique =>
      ['grounding', 'reasoning', 'tooling', 'completeness'].includes(critique.failureType)
    );

    const action = this._resolveAction(weighted, {
      disagreement,
      hasCritical,
      hasEscalation,
      hasRejection,
      branchWorthy,
      totalImpact,
    });

    return {
      action,
      strategy: this.strategy,
      reason: this._buildReason(action, { disagreement, hasCritical, hasEscalation, hasRejection, branchWorthy }),
      disagreement,
      rankedCritiques,
      summary: {
        totalCritiques: critiques.length,
        weightedImpact: Number(totalImpact.toFixed(3)),
        strongestCritic: rankedCritiques[0]?.criticId || null,
        trustConsensus: this._buildTrustConsensus(weighted),
      },
    };
  }

  _resolveAction(weighted, flags) {
    if (flags.hasCritical || flags.hasEscalation) {
      return 'escalate';
    }

    if (this.strategy === 'majority_vote') {
      return this._resolveByMajority(weighted, flags);
    }

    if (this.strategy === 'trust_consensus') {
      return this._resolveByTrustConsensus(weighted, flags);
    }

    if (this.strategy === 'severity_first') {
      return this._resolveBySeverity(weighted, flags);
    }

    return this._resolveByWeightedImpact(weighted, flags);
  }

  _resolveByWeightedImpact(weighted, flags) {
    if (flags.disagreement && this.escalateOnDisagreement) {
      return 'escalate';
    }
    if (flags.hasRejection && flags.branchWorthy) {
      return 'branch_and_retry';
    }
    if (flags.hasRejection || flags.totalImpact < -0.25) {
      return 'reject';
    }
    if (weighted.some(critique => critique.verdict === 'revise')) {
      return 'revise';
    }
    return 'accept';
  }

  _resolveByMajority(weighted, flags) {
    const counts = weighted.reduce((acc, critique) => {
      acc[critique.verdict] = (acc[critique.verdict] || 0) + 1;
      return acc;
    }, {});
    const majorityVerdict = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'accept';

    if (flags.disagreement && this.escalateOnDisagreement && counts.escalate) {
      return 'escalate';
    }
    if (majorityVerdict === 'reject') {
      return flags.branchWorthy ? 'branch_and_retry' : 'reject';
    }
    if (majorityVerdict === 'revise') {
      return 'revise';
    }
    if (majorityVerdict === 'escalate') {
      return 'escalate';
    }
    return 'accept';
  }

  _resolveByTrustConsensus(weighted, flags) {
    const trustByVerdict = weighted.reduce((acc, critique) => {
      acc[critique.verdict] = (acc[critique.verdict] || 0) + critique.trust;
      return acc;
    }, {});
    const topVerdict = Object.entries(trustByVerdict).sort((a, b) => b[1] - a[1])[0]?.[0] || 'accept';
    const topTrust = trustByVerdict[topVerdict] || 0;

    if (flags.disagreement && topTrust < this.trustThreshold && this.escalateOnDisagreement) {
      return 'escalate';
    }
    if (topVerdict === 'reject') {
      return flags.branchWorthy ? 'branch_and_retry' : 'reject';
    }
    if (topVerdict === 'revise') {
      return 'revise';
    }
    if (topVerdict === 'escalate') {
      return 'escalate';
    }
    return 'accept';
  }

  _resolveBySeverity(weighted, flags) {
    const topSeverity = [...weighted].sort((a, b) => {
      const order = { critical: 4, high: 3, medium: 2, low: 1 };
      return order[b.severity || 'medium'] - order[a.severity || 'medium'];
    })[0];

    if (!topSeverity) {
      return 'accept';
    }
    if (topSeverity.severity === 'critical') {
      return 'escalate';
    }
    if (topSeverity.verdict === 'reject') {
      return flags.branchWorthy ? 'branch_and_retry' : 'reject';
    }
    if (topSeverity.verdict === 'revise') {
      return 'revise';
    }
    return this._resolveByWeightedImpact(weighted, flags);
  }

  _buildTrustConsensus(weighted) {
    const trustByVerdict = weighted.reduce((acc, critique) => {
      acc[critique.verdict] = Number(((acc[critique.verdict] || 0) + critique.trust).toFixed(3));
      return acc;
    }, {});

    return {
      threshold: this.trustThreshold,
      byVerdict: trustByVerdict,
    };
  }

  _buildReason(action, flags) {
    if (action === 'accept') {
      return 'Critiques did not identify a material issue.';
    }
    if (action === 'escalate' && flags.hasCritical) {
      return 'A critical critique requires escalation.';
    }
    if (action === 'escalate' && flags.disagreement) {
      return 'Reviewer disagreement requires escalation.';
    }
    if (action === 'branch_and_retry') {
      return 'A recoverable reasoning or grounding failure suggests branching and retrying.';
    }
    if (action === 'reject') {
      return 'Critiques converged on a rejecting outcome.';
    }
    return 'Critiques indicate the candidate should be revised.';
  }
}

module.exports = { DisagreementResolver };
