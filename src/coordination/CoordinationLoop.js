const { CritiqueProtocol } = require('./CritiqueProtocol');
const { TrustRegistry } = require('./TrustRegistry');
const { DisagreementResolver } = require('./DisagreementResolver');

/**
 * Orchestrates a simple propose -> critique -> resolve -> act loop without
 * collapsing coordination into hidden prompt text.
 */
class CoordinationLoop {
  /**
   * @param {object} [options]
   * @param {CritiqueProtocol|object|null} [options.critiqueProtocol]
   * @param {TrustRegistry|object|null} [options.trustRegistry]
   * @param {DisagreementResolver|object|null} [options.disagreementResolver]
   * @param {object<string, Function>} [options.handlers]
   * @param {Array<object>} [options.history]
   */
  constructor({
    critiqueProtocol = null,
    trustRegistry = null,
    disagreementResolver = null,
    handlers = {},
    history = [],
  } = {}) {
    this.trustRegistry =
      trustRegistry instanceof TrustRegistry ? trustRegistry : new TrustRegistry(trustRegistry || {});
    this.critiqueProtocol =
      critiqueProtocol instanceof CritiqueProtocol
        ? critiqueProtocol
        : new CritiqueProtocol(critiqueProtocol || {});
    this.disagreementResolver =
      disagreementResolver instanceof DisagreementResolver
        ? disagreementResolver
        : new DisagreementResolver({
            ...(disagreementResolver || {}),
            trustRegistry: this.trustRegistry,
          });
    this.handlers = { ...handlers };
    this.history = Array.isArray(history) ? [...history] : [];
  }

  /**
   * Run one coordination cycle.
   *
   * @param {object} candidate
   * @param {object} [context]
   * @returns {Promise<object>}
   */
  async coordinate(candidate = {}, context = {}) {
    const review = await this.critiqueProtocol.review(candidate, context);
    const resolution = this.disagreementResolver.resolve(review.critiques, context);
    const result = await this._executeResolution(resolution, candidate, review, context);

    const record = {
      candidateId: candidate.id || context.candidateId || null,
      review,
      resolution,
      result,
      timestamp: new Date().toISOString(),
    };
    this.history.push(record);
    this._updateTrust(review.critiques, resolution, result, context);
    return record;
  }

  listHistory() {
    return [...this.history];
  }

  _updateTrust(critiques = [], resolution = {}, result = {}, context = {}) {
    const successfulActions = ['accept', 'revise', 'branch_and_retry', 'escalate'];
    const actionSucceeded = result?.ok !== false && successfulActions.includes(resolution.action);

    for (const critique of critiques) {
      this.trustRegistry.recordOutcome({
        actorId: critique.criticId,
        domain: context.domain || critique.failureType || 'general',
        taskFamily: context.taskFamily || critique.metadata?.taskFamily || null,
        role: critique.metadata?.role || 'critic',
        success:
          resolution.action === 'accept'
            ? critique.verdict === 'accept'
            : critique.recommendedAction === resolution.action || critique.verdict === resolution.action
              ? actionSucceeded
              : false,
        confidence: critique.confidence,
        outcomeType:
          result?.output?.recoveryExecuted || resolution.action === 'branch_and_retry'
            ? 'recovery'
            : resolution.action === 'escalate'
              ? 'escalation'
              : resolution.action === 'revise'
                ? 'retry'
                : 'direct',
        retries: typeof result?.output?.retries === 'number' ? result.output.retries : 0,
        recoverySucceeded: typeof result?.output?.recoverySucceeded === 'boolean' ? result.output.recoverySucceeded : null,
        metadata: {
          resolutionAction: resolution.action,
          candidateId: critique.candidateId,
        },
      });
    }
  }

  async _executeResolution(resolution, candidate, review, context) {
    const handler = this.handlers[resolution.action];
    if (typeof handler === 'function') {
      const output = await handler({ candidate, review, resolution, context });
      return {
        action: resolution.action,
        ok: output?.ok !== false,
        output,
      };
    }

    return {
      action: resolution.action,
      ok: true,
      output: {
        handled: false,
        reason: 'No coordination handler was configured for this action.',
      },
    };
  }
}

module.exports = { CoordinationLoop };
