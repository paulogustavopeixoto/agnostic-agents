class InterventionPolicyRegistry {
  constructor({ policies = [] } = {}) {
    this.policies = Array.isArray(policies) ? [...policies] : [];
  }

  register(policy = {}) {
    if (!policy.id) {
      throw new Error('InterventionPolicyRegistry requires policy.id.');
    }
    const normalized = {
      id: policy.id,
      environment: policy.environment || null,
      taskFamily: policy.taskFamily || null,
      riskClass: policy.riskClass || null,
      incidentType: policy.incidentType || null,
      recommendedAction: policy.recommendedAction || 'monitor_only',
      checklist: Array.isArray(policy.checklist) ? [...policy.checklist] : [],
      rationaleTemplate: policy.rationaleTemplate || null,
      metadata: policy.metadata || {},
    };
    this.policies.push(normalized);
    return normalized;
  }

  select(context = {}) {
    const matches = this.policies.filter(policy => this._matches(policy, context));
    const selected = matches[0] || null;

    return {
      selectedPolicy: selected,
      matchedPolicyIds: matches.map(policy => policy.id),
      recommendedAction: selected?.recommendedAction || null,
      checklist: selected?.checklist || [],
      rationale: selected?.rationaleTemplate
        ? selected.rationaleTemplate
            .replace('{taskFamily}', context.taskFamily || 'task')
            .replace('{riskClass}', context.riskClass || 'unknown')
            .replace('{environment}', context.environment || 'unknown')
        : null,
    };
  }

  _matches(policy, context) {
    if (policy.environment && policy.environment !== context.environment) return false;
    if (policy.taskFamily && policy.taskFamily !== context.taskFamily) return false;
    if (policy.riskClass && policy.riskClass !== context.riskClass) return false;
    if (policy.incidentType && policy.incidentType !== context.incidentType) return false;
    return true;
  }
}

module.exports = { InterventionPolicyRegistry };
