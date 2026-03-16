class GovernanceHooks {
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
