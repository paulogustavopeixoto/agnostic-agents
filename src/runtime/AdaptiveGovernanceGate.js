const { AdaptiveDecisionLedger } = require('./AdaptiveDecisionLedger');
const { ApprovalInbox } = require('./ApprovalInbox');
const { GovernanceHooks } = require('./GovernanceHooks');

/**
 * Ensures adaptive suggestions and decisions follow the same review path as
 * other governed runtime actions when they materially change runtime behavior.
 */
class AdaptiveGovernanceGate {
  /**
   * @param {object} [options]
   * @param {AdaptiveDecisionLedger|null} [options.ledger]
   * @param {ApprovalInbox|null} [options.approvalInbox]
   * @param {GovernanceHooks|object|null} [options.governanceHooks]
   * @param {string[]} [options.materialCategories]
   * @param {string[]} [options.materialPriorities]
   * @param {Function|null} [options.requireApproval]
   */
  constructor({
    ledger = null,
    approvalInbox = null,
    governanceHooks = null,
    materialCategories = ['tool_policy', 'verifier_policy', 'routing_policy'],
    materialPriorities = ['high'],
    requireApproval = null,
  } = {}) {
    this.ledger =
      ledger instanceof AdaptiveDecisionLedger ? ledger : ledger ? new AdaptiveDecisionLedger(ledger) : null;
    this.approvalInbox = approvalInbox instanceof ApprovalInbox ? approvalInbox : approvalInbox || null;
    this.governanceHooks =
      governanceHooks instanceof GovernanceHooks
        ? governanceHooks
        : governanceHooks
          ? new GovernanceHooks(governanceHooks)
          : null;
    this.materialCategories = new Set(materialCategories);
    this.materialPriorities = new Set(materialPriorities);
    this.requireApproval = typeof requireApproval === 'function' ? requireApproval : null;
  }

  /**
   * Determine whether an adaptive entry is material enough to require approval.
   *
   * @param {object} entry
   * @param {object} [context]
   * @returns {Promise<object>}
   */
  async evaluate(entry = {}, context = {}) {
    if (this.requireApproval) {
      const custom = await this.requireApproval(entry, context);
      if (custom?.action) {
        return custom;
      }
      if (custom === true) {
        return {
          action: 'require_approval',
          reason: 'Adaptive governance callback required explicit approval.',
          source: 'callback',
        };
      }
    }

    const priority =
      context.priority ||
      entry.recommendation?.priority ||
      entry.decision?.priority ||
      entry.metadata?.priority ||
      null;
    const category = entry.category || context.category || 'general';
    const applied =
      context.applied === true || entry.applied === true || context.applyImmediately === true;
    const material =
      applied || this.materialCategories.has(category) || (priority && this.materialPriorities.has(priority));

    return material
      ? {
          action: 'require_approval',
          reason: 'Material adaptive changes must go through approval before application.',
          source: 'policy',
        }
      : {
          action: 'allow',
          reason: 'Adaptive entry is advisory-only or below the materiality threshold.',
          source: 'policy',
        };
  }

  /**
   * Record and govern an adaptive suggestion.
   *
   * @param {object} suggestion
   * @param {object} [metadata]
   * @returns {Promise<object>}
   */
  async reviewSuggestion(suggestion = {}, metadata = {}) {
    const entry = this.ledger
      ? await this.ledger.recordSuggestion(suggestion, metadata)
      : {
          id: suggestion.id || metadata.id || 'adaptive-suggestion',
          type: 'suggestion',
          category: suggestion.category || metadata.category || 'general',
          recommendation: suggestion,
          metadata,
        };

    return this._reviewEntry(entry, { ...metadata, priority: suggestion.priority || metadata.priority });
  }

  /**
   * Record and govern an adaptive decision before it is applied.
   *
   * @param {object} decision
   * @param {object} [metadata]
   * @returns {Promise<object>}
   */
  async reviewDecision(decision = {}, metadata = {}) {
    const entry = this.ledger
      ? await this.ledger.recordDecision(decision, {
          ...metadata,
          approved: metadata.approved === true,
          applied: metadata.applied === true,
        })
      : {
          id: decision.id || metadata.id || 'adaptive-decision',
          type: 'decision',
          category: decision.category || metadata.category || 'general',
          decision,
          metadata,
        };

    return this._reviewEntry(entry, {
      ...metadata,
      priority: decision.priority || metadata.priority,
      applied: metadata.applied === true,
    });
  }

  /**
   * Resolve a pending adaptive review request.
   *
   * @param {string} reviewId
   * @param {object} [resolution]
   * @returns {Promise<object>}
   */
  async resolveReview(reviewId, resolution = {}) {
    if (!this.approvalInbox?.resolve) {
      throw new Error('AdaptiveGovernanceGate requires an approvalInbox to resolve reviews.');
    }

    const request = await this.approvalInbox.resolve(reviewId);
    if (!request) {
      throw new Error(`Adaptive review "${reviewId}" not found.`);
    }

    const result = {
      reviewId,
      adaptiveEntryId: request.adaptiveEntryId,
      approved: resolution.approved === true,
      applied: resolution.applied === true,
      reason: resolution.reason || null,
      request,
    };

    if (this.ledger) {
      await this.ledger.recordDecision(
        {
          id: `${request.adaptiveEntryId}:resolution:${result.approved ? 'approved' : 'denied'}`,
          category: request.category || 'adaptive_review',
          summary: result.approved
            ? 'Adaptive change approved through governance review.'
            : 'Adaptive change denied through governance review.',
          evidence: {
            adaptiveEntryId: request.adaptiveEntryId,
            reviewId,
            approved: result.approved,
          },
        },
        {
          source: 'adaptive_governance',
          approved: result.approved,
          applied: result.applied,
          replay: request.replay || null,
          rollback: request.rollback || null,
          reviewId,
        }
      );
    }

    if (this.governanceHooks) {
      await this.governanceHooks.dispatch('adaptive_review_resolved', result, {
        reviewId,
        request,
      });
    }

    return result;
  }

  async _reviewEntry(entry, metadata = {}) {
    const decision = await this.evaluate(entry, metadata);
    if (decision.action !== 'require_approval') {
      if (this.governanceHooks) {
        await this.governanceHooks.dispatch(
          'adaptive_review_allowed',
          {
            adaptiveEntryId: entry.id,
            category: entry.category,
            decision,
          },
          { entry, metadata }
        );
      }

      return {
        action: 'allow',
        entry,
        decision,
        request: null,
      };
    }

    const reviewId = metadata.reviewId || metadata.runId || entry.id;
    const request = {
      runId: reviewId,
      reviewId,
      type: 'adaptive_change',
      adaptiveEntryId: entry.id,
      category: entry.category,
      summary: entry.summary || entry.recommendation?.suggestion || entry.decision?.summary || null,
      priority:
        metadata.priority || entry.recommendation?.priority || entry.decision?.priority || entry.metadata?.priority,
      reason: decision.reason,
      replay: entry.replay || null,
      rollback: entry.rollback || null,
      metadata,
    };

    if (this.approvalInbox?.add) {
      await this.approvalInbox.add(request);
    }

    if (this.governanceHooks) {
      await this.governanceHooks.dispatch('adaptive_review_requested', request, {
        entry,
        decision,
      });
    }

    return {
      action: 'require_approval',
      entry,
      decision,
      request,
    };
  }
}

module.exports = { AdaptiveGovernanceGate };
