/**
 * Host-facing governance callback registry for approvals, policy decisions,
 * verifier completion, and terminal run events.
 */
class GovernanceHooks {
  /**
   * @param {object} [options]
   * @param {Function|null} [options.onApprovalRequested]
   * @param {Function|null} [options.onApprovalResolved]
   * @param {Function|null} [options.onPolicyDecision]
   * @param {Function|null} [options.onVerifierCompleted]
   * @param {Function|null} [options.onRunCompleted]
   * @param {Function|null} [options.onRunFailed]
   * @param {Function|null} [options.onEvent]
   */
  constructor({
    onApprovalRequested = null,
    onApprovalResolved = null,
    onPolicyDecision = null,
    onVerifierCompleted = null,
    onRunCompleted = null,
    onRunFailed = null,
    onEvent = null,
  } = {}) {
    this.handlers = {
      approval_requested: onApprovalRequested,
      approval_resolved: onApprovalResolved,
      policy_decision: onPolicyDecision,
      verifier_completed: onVerifierCompleted,
      run_completed: onRunCompleted,
      run_failed: onRunFailed,
    };
    this.onEvent = onEvent;
  }

  /**
   * Dispatches a governance event to its typed handler and the catch-all hook.
   *
   * @param {string} type
   * @param {object} [payload]
   * @param {object} [context]
   * @returns {Promise<void>}
   */
  async dispatch(type, payload = {}, context = {}) {
    const handler = this.handlers[type];
    if (typeof handler === 'function') {
      await handler(payload, context);
    }

    if (typeof this.onEvent === 'function') {
      await this.onEvent(type, payload, context);
    }
  }
}

module.exports = { GovernanceHooks };
