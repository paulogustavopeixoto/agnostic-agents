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
  constructor({ trustRegistry = null, escalateOnDisagreement = true } = {}) {
    this.trustRegistry =
      trustRegistry instanceof TrustRegistry ? trustRegistry : trustRegistry ? new TrustRegistry(trustRegistry) : null;
    this.escalateOnDisagreement = escalateOnDisagreement !== false;
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

    let action = 'accept';
    if (hasCritical || hasEscalation) {
      action = 'escalate';
    } else if (disagreement && this.escalateOnDisagreement) {
      action = 'escalate';
    } else if (hasRejection && branchWorthy) {
      action = 'branch_and_retry';
    } else if (hasRejection || totalImpact < -0.25) {
      action = 'reject';
    } else if (weighted.some(critique => critique.verdict === 'revise')) {
      action = 'revise';
    }

    return {
      action,
      reason: this._buildReason(action, { disagreement, hasCritical, hasEscalation, hasRejection, branchWorthy }),
      disagreement,
      rankedCritiques,
      summary: {
        totalCritiques: critiques.length,
        weightedImpact: Number(totalImpact.toFixed(3)),
        strongestCritic: rankedCritiques[0]?.criticId || null,
      },
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
