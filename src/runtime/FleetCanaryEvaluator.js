const { FleetRolloutPlan } = require('./FleetRolloutPlan');
const { FleetHealthMonitor } = require('./FleetHealthMonitor');

class FleetCanaryEvaluator {
  constructor({ monitor = null } = {}) {
    this.monitor = monitor instanceof FleetHealthMonitor ? monitor : new FleetHealthMonitor(monitor || {});
  }

  evaluate(plan = {}, summary = null) {
    const rolloutPlan = plan instanceof FleetRolloutPlan ? plan : new FleetRolloutPlan(plan || {});
    const healthSummary = summary || this.monitor.summarize();
    const triggered = rolloutPlan.rollbackTriggers.filter(trigger =>
      this._matchesTrigger(trigger, healthSummary)
    );

    return {
      plan: rolloutPlan.summarize(),
      health: healthSummary,
      action: triggered.length ? 'halt_and_rollback' : 'promote_next_stage',
      triggered,
    };
  }

  _matchesTrigger(trigger = {}, summary = {}) {
    const left = summary[trigger.metric];
    const right = trigger.threshold;
    switch (trigger.operator) {
      case '>=':
        return left >= right;
      case '<':
        return left < right;
      case '<=':
        return left <= right;
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      case '>':
      default:
        return left > right;
    }
  }
}

module.exports = { FleetCanaryEvaluator };
