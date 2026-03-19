const { FleetRolloutPlan } = require('./FleetRolloutPlan');
const { FleetImpactComparator } = require('./FleetImpactComparator');

class FleetRollbackAdvisor {
  constructor({ comparator = null } = {}) {
    this.comparator =
      comparator instanceof FleetImpactComparator ? comparator : new FleetImpactComparator(comparator || {});
  }

  advise({ plan = null, comparison = null, safetyDecision = null } = {}) {
    const rolloutPlan = plan instanceof FleetRolloutPlan ? plan : new FleetRolloutPlan(plan || {});
    const impact = comparison || this.comparator.compare();
    const reasons = [];

    if (impact?.impact?.regressed === true) {
      reasons.push('Fleet impact comparison shows the rollout regressed key health signals.');
    }
    if ((impact?.delta?.failedRuns || 0) > 0) {
      reasons.push(`Failed runs increased by ${impact.delta.failedRuns} after rollout.`);
    }
    if ((impact?.delta?.adaptiveRegressions || 0) > 0) {
      reasons.push(`Adaptive regressions increased by ${impact.delta.adaptiveRegressions} after rollout.`);
    }
    if ((impact?.delta?.schedulerBacklog || 0) > 0) {
      reasons.push(`Scheduler backlog increased by ${impact.delta.schedulerBacklog} after rollout.`);
    }
    if (safetyDecision?.action === 'halt') {
      reasons.push('Fleet safety controller halted the rollout.');
    }

    return {
      plan: rolloutPlan.summarize(),
      action: reasons.length ? 'rollback_recommended' : 'continue_with_caution',
      reasons,
      rollback: {
        action: 'restore_previous_stage_or_version',
        targetId: rolloutPlan.target.id || null,
        version: rolloutPlan.target.version || null,
      },
      comparison: impact,
      safetyDecision: safetyDecision || null,
    };
  }
}

module.exports = { FleetRollbackAdvisor };
