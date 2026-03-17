class PolicyDecisionReport {
  constructor({
    mode = 'request',
    policyPack = null,
    decisions = [],
    metadata = {},
  } = {}) {
    this.mode = mode;
    this.policyPack = policyPack;
    this.decisions = [...decisions];
    this.metadata = { ...metadata };
  }

  summarize() {
    const actionCounts = {};
    const sourceCounts = {};
    const ruleCounts = {};

    for (const decision of this.decisions) {
      actionCounts[decision.action] = (actionCounts[decision.action] || 0) + 1;
      sourceCounts[decision.source] = (sourceCounts[decision.source] || 0) + 1;
      if (decision.ruleId) {
        ruleCounts[decision.ruleId] = (ruleCounts[decision.ruleId] || 0) + 1;
      }
    }

    return {
      total: this.decisions.length,
      actionCounts,
      sourceCounts,
      ruleCounts,
      denied: actionCounts.deny || 0,
      approvalsRequired: actionCounts.require_approval || 0,
      allowed: actionCounts.allow || 0,
    };
  }

  explain() {
    const decisions = this.decisions.map(decision => ({
      toolName: decision.toolName || null,
      action: decision.action,
      source: decision.source || 'unknown',
      ruleId: decision.ruleId || null,
      explanation: this._buildDecisionExplanation(decision),
    }));

    return {
      mode: this.mode,
      summary: this.summarize(),
      decisions,
    };
  }

  toJSON() {
    return {
      mode: this.mode,
      policyPack: this.policyPack,
      metadata: { ...this.metadata },
      decisions: [...this.decisions],
      summary: this.summarize(),
      explanations: this.explain().decisions,
    };
  }

  _buildDecisionExplanation(decision = {}) {
    const toolName = decision.toolName || 'unknown tool';
    const action = decision.action || 'allow';
    const source = decision.source || 'default';
    const reason = decision.reason || null;
    const ruleId = decision.ruleId || null;
    const matchedRule = decision.matchedRule || null;

    if (source === 'rule' && ruleId) {
      if (matchedRule?.toolNames?.length) {
        return `${action} because rule "${ruleId}" matched tool "${toolName}".`;
      }

      if (matchedRule?.sideEffectLevels?.length) {
        return `${action} because rule "${ruleId}" matched side effect level "${matchedRule.sideEffectLevels.join(', ')}".`;
      }

      if (matchedRule?.tags?.length) {
        return `${action} because rule "${ruleId}" matched tags "${matchedRule.tags.join(', ')}".`;
      }

      return `${action} because rule "${ruleId}" matched this request.`;
    }

    if (reason) {
      return `${action} because ${reason}`;
    }

    return `${action} from ${source} policy evaluation for "${toolName}".`;
  }
}

module.exports = { PolicyDecisionReport };
