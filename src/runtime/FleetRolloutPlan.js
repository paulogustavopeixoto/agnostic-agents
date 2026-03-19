class FleetRolloutPlan {
  constructor({
    id = null,
    target = {},
    stages = [],
    rollbackTriggers = [],
    metadata = {},
  } = {}) {
    this.id = id || `fleet-rollout:${target.id || 'plan'}`;
    this.target = {
      id: target.id || null,
      type: target.type || 'runtime_change',
      version: target.version || null,
    };
    this.stages = (Array.isArray(stages) ? stages : []).map((stage, index) => this._normalizeStage(stage, index));
    this.rollbackTriggers = (Array.isArray(rollbackTriggers) ? rollbackTriggers : []).map(trigger => ({
      metric: trigger.metric || null,
      operator: trigger.operator || '>',
      threshold: trigger.threshold ?? null,
      action: trigger.action || 'halt_and_rollback',
    }));
    this.metadata = { ...metadata };
  }

  summarize() {
    return {
      id: this.id,
      target: { ...this.target },
      stages: this.stages.map(stage => ({
        id: stage.id,
        percentage: stage.percentage,
        scope: stage.scope,
      })),
      rollbackTriggers: [...this.rollbackTriggers],
    };
  }

  toJSON() {
    return {
      id: this.id,
      target: { ...this.target },
      stages: this.stages.map(stage => ({ ...stage })),
      rollbackTriggers: [...this.rollbackTriggers],
      metadata: { ...this.metadata },
    };
  }

  static fromJSON(payload = {}) {
    return new FleetRolloutPlan(payload);
  }

  _normalizeStage(stage = {}, index = 0) {
    return {
      id: stage.id || `${this.id}:stage:${index + 1}`,
      percentage: Number.isFinite(stage.percentage) ? stage.percentage : 0,
      scope: stage.scope || 'fleet',
      tenantIds: Array.isArray(stage.tenantIds) ? [...stage.tenantIds] : [],
      environmentIds: Array.isArray(stage.environmentIds) ? [...stage.environmentIds] : [],
      requiresCanary: stage.requiresCanary !== false,
      description: stage.description || null,
    };
  }
}

module.exports = { FleetRolloutPlan };
