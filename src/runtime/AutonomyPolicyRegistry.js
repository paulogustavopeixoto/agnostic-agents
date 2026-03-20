class AutonomyPolicyRegistry {
  constructor({ policies = [] } = {}) {
    this.policies = Array.isArray(policies) ? [...policies] : [];
  }

  register(policy = {}) {
    const normalized = this._normalizePolicy(policy);
    this.policies.push(normalized);
    return normalized;
  }

  list() {
    return this.policies.map(policy => ({ ...policy }));
  }

  resolve(request = {}) {
    const matches = this.policies.filter(policy => this._matches(policy, request));
    const merged = {
      matchedPolicyIds: matches.map(policy => policy.id),
      environment: request.environment || null,
      tenant: request.tenant || null,
      jurisdiction: request.jurisdiction || null,
      taskFamily: request.taskFamily || null,
      riskClass: request.riskClass || null,
      trustZone: request.trustZone || null,
      dataHandling: [],
      escalationAction: null,
      reviewRequired: false,
      allowedTools: null,
      disallowedTools: [],
      metadata: {},
    };

    for (const policy of matches) {
      if (Array.isArray(policy.dataHandling)) {
        for (const item of policy.dataHandling) {
          if (!merged.dataHandling.includes(item)) {
            merged.dataHandling.push(item);
          }
        }
      }

      if (policy.escalationAction) {
        merged.escalationAction = policy.escalationAction;
      }

      if (policy.reviewRequired) {
        merged.reviewRequired = true;
      }

      if (Array.isArray(policy.allowedTools) && policy.allowedTools.length) {
        merged.allowedTools = merged.allowedTools
          ? merged.allowedTools.filter(toolName => policy.allowedTools.includes(toolName))
          : [...policy.allowedTools];
      }

      if (Array.isArray(policy.disallowedTools)) {
        for (const toolName of policy.disallowedTools) {
          if (!merged.disallowedTools.includes(toolName)) {
            merged.disallowedTools.push(toolName);
          }
        }
      }

      merged.metadata = {
        ...merged.metadata,
        ...policy.metadata,
      };
    }

    return merged;
  }

  evaluate(request = {}) {
    const resolved = this.resolve(request);
    const toolName = request.toolName || null;

    if (toolName && resolved.allowedTools && !resolved.allowedTools.includes(toolName)) {
      return {
        action: 'deny',
        reason: `Tool "${toolName}" is not allowed by the active autonomy policy.`,
        policy: resolved,
      };
    }

    if (toolName && resolved.disallowedTools.includes(toolName)) {
      return {
        action: 'deny',
        reason: `Tool "${toolName}" is explicitly disallowed by the active autonomy policy.`,
        policy: resolved,
      };
    }

    if (resolved.reviewRequired) {
      return {
        action: resolved.escalationAction || 'review',
        reason: 'The active autonomy policy requires supervised execution for this request.',
        policy: resolved,
      };
    }

    return {
      action: 'allow',
      reason: null,
      policy: resolved,
    };
  }

  _normalizePolicy(policy = {}) {
    if (!policy.id) {
      throw new Error('AutonomyPolicyRegistry requires policy.id.');
    }

    return {
      id: policy.id,
      environment: policy.environment || null,
      tenant: policy.tenant || null,
      jurisdiction: policy.jurisdiction || null,
      taskFamily: policy.taskFamily || null,
      riskClass: policy.riskClass || null,
      trustZone: policy.trustZone || null,
      dataHandling: Array.isArray(policy.dataHandling) ? [...policy.dataHandling] : [],
      escalationAction: policy.escalationAction || null,
      reviewRequired: Boolean(policy.reviewRequired),
      allowedTools: Array.isArray(policy.allowedTools) ? [...policy.allowedTools] : null,
      disallowedTools: Array.isArray(policy.disallowedTools) ? [...policy.disallowedTools] : [],
      metadata: policy.metadata || {},
    };
  }

  _matches(policy, request) {
    if (policy.environment && policy.environment !== request.environment) return false;
    if (policy.tenant && policy.tenant !== request.tenant) return false;
    if (policy.jurisdiction && policy.jurisdiction !== request.jurisdiction) return false;
    if (policy.taskFamily && policy.taskFamily !== request.taskFamily) return false;
    if (policy.riskClass && policy.riskClass !== request.riskClass) return false;
    if (policy.trustZone && policy.trustZone !== request.trustZone) return false;
    return true;
  }
}

module.exports = { AutonomyPolicyRegistry };
