class AdaptationPolicyEnvelope {
  constructor({
    allowedTargetSurfaces = ['routing', 'policy', 'decomposition', 'coordination', 'evaluation'],
    deniedTargetSurfaces = [],
    allowedChangeTypes = [],
    deniedChangeTypes = [],
    maxPriority = 'high',
    requireApprovalCategories = ['incident', 'governance', 'evaluation', 'branch_comparison'],
    materialChangeTypes = ['policy_adjustment', 'incident_driven_adjustment'],
    constraints = {},
  } = {}) {
    this.allowedTargetSurfaces = new Set(allowedTargetSurfaces);
    this.deniedTargetSurfaces = new Set(deniedTargetSurfaces);
    this.allowedChangeTypes = new Set(allowedChangeTypes);
    this.deniedChangeTypes = new Set(deniedChangeTypes);
    this.maxPriority = maxPriority;
    this.requireApprovalCategories = new Set(requireApprovalCategories);
    this.materialChangeTypes = new Set(materialChangeTypes);
    this.constraints = { ...constraints };
  }

  evaluate(proposal = {}) {
    const reasons = [];
    const targetSurface = proposal.targetSurface || null;
    const changeType = proposal.changeType || null;
    const priority = proposal.priority || 'medium';
    const category = proposal.category || 'general';

    if (targetSurface && this.deniedTargetSurfaces.has(targetSurface)) {
      reasons.push(`Target surface "${targetSurface}" is outside the approved adaptation envelope.`);
    } else if (
      this.allowedTargetSurfaces.size > 0 &&
      targetSurface &&
      !this.allowedTargetSurfaces.has(targetSurface)
    ) {
      reasons.push(`Target surface "${targetSurface}" is not listed in the approved adaptation envelope.`);
    }

    if (changeType && this.deniedChangeTypes.has(changeType)) {
      reasons.push(`Change type "${changeType}" is explicitly denied by the adaptation envelope.`);
    } else if (this.allowedChangeTypes.size > 0 && changeType && !this.allowedChangeTypes.has(changeType)) {
      reasons.push(`Change type "${changeType}" is not allowed by the adaptation envelope.`);
    }

    if (this._priorityRank(priority) > this._priorityRank(this.maxPriority)) {
      reasons.push(`Priority "${priority}" exceeds the envelope maximum of "${this.maxPriority}".`);
    }

    const approvalRequired =
      this.requireApprovalCategories.has(category) || this.materialChangeTypes.has(changeType);

    return {
      action: reasons.length ? 'deny' : approvalRequired ? 'require_approval' : 'allow',
      reasons,
      constraints: { ...this.constraints },
      bounded: reasons.length === 0,
      targetSurface,
      changeType,
      category,
      priority,
    };
  }

  explain(proposal = {}) {
    const result = this.evaluate(proposal);
    return result.reasons.length
      ? result.reasons.join(' ')
      : result.action === 'require_approval'
        ? 'The proposed change is inside the approved envelope but still requires review before application.'
        : 'The proposed change is inside the approved adaptation envelope.';
  }

  _priorityRank(priority) {
    return {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    }[priority || 'medium'] || 2;
  }
}

module.exports = { AdaptationPolicyEnvelope };
