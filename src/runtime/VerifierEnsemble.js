/**
 * Composes multiple verifier/reviewer functions or adapters into a single
 * inspectable verifier decision.
 */
class VerifierEnsemble {
  /**
   * @param {object} [options]
   * @param {Array<Function|object>} [options.reviewers]
   * @param {'most_restrictive'|'escalate_on_disagreement'} [options.strategy]
   */
  constructor({ reviewers = [], strategy = 'most_restrictive' } = {}) {
    this.reviewers = Array.isArray(reviewers) ? [...reviewers] : [];
    this.strategy = strategy;
  }

  /**
   * Verify a tool or final response across all configured reviewers.
   *
   * @param {object} tool
   * @param {object} args
   * @param {object} [context]
   * @returns {Promise<object>}
   */
  async verify(tool, args, context = {}) {
    const verdicts = [];

    for (const reviewer of this.reviewers) {
      const verdict = await this._invokeReviewer(reviewer, tool, args, context);
      if (verdict) {
        verdicts.push(verdict);
      }
    }

    if (!verdicts.length) {
      return { action: 'allow', reason: null, source: 'verifier_ensemble', reviewers: [] };
    }

    const actions = verdicts.map(verdict => verdict.action || 'allow');
    const denyCount = actions.filter(action => action === 'deny').length;
    const approvalCount = actions.filter(action => action === 'require_approval').length;
    const allowCount = actions.filter(action => action === 'allow').length;
    const hasDisagreement = new Set(actions).size > 1;

    let action = 'allow';
    if (this.strategy === 'escalate_on_disagreement' && hasDisagreement) {
      action = denyCount > 0 ? 'deny' : 'require_approval';
    } else if (denyCount > 0) {
      action = 'deny';
    } else if (approvalCount > 0) {
      action = 'require_approval';
    }

    return {
      action,
      reason: this._buildReason(action, verdicts, { hasDisagreement, allowCount, approvalCount, denyCount }),
      source: 'verifier_ensemble',
      reviewers: verdicts,
      strategy: this.strategy,
    };
  }

  async _invokeReviewer(reviewer, tool, args, context) {
    if (typeof reviewer === 'function') {
      return reviewer(tool, args, context);
    }

    if (reviewer?.verify) {
      return reviewer.verify(tool, args, context);
    }

    if (reviewer?.generateText) {
      return null;
    }

    return null;
  }

  _buildReason(action, verdicts, counts) {
    if (action === 'allow') {
      return verdicts.find(verdict => verdict.reason)?.reason || 'All reviewers allowed the action.';
    }

    const matching = verdicts.filter(verdict => verdict.action === action);
    const firstReason = matching.find(verdict => verdict.reason)?.reason;
    if (firstReason) {
      return firstReason;
    }

    if (counts.hasDisagreement) {
      return 'Reviewer disagreement triggered a stricter verifier outcome.';
    }

    if (action === 'deny') {
      return 'At least one reviewer denied the action.';
    }

    return 'At least one reviewer required approval for the action.';
  }
}

module.exports = { VerifierEnsemble };
