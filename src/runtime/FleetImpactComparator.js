const { FleetHealthMonitor } = require('./FleetHealthMonitor');

class FleetImpactComparator {
  constructor({ before = null, after = null } = {}) {
    this.before = before instanceof FleetHealthMonitor ? before : new FleetHealthMonitor(before || {});
    this.after = after instanceof FleetHealthMonitor ? after : new FleetHealthMonitor(after || {});
  }

  compare(beforeSummary = null, afterSummary = null) {
    const before = beforeSummary || this.before.summarize();
    const after = afterSummary || this.after.summarize();

    return {
      before,
      after,
      delta: {
        runs: (after.runs || 0) - (before.runs || 0),
        failedRuns: (after.failedRuns || 0) - (before.failedRuns || 0),
        pausedRuns: (after.pausedRuns || 0) - (before.pausedRuns || 0),
        adaptiveRegressions: (after.adaptiveRegressions || 0) - (before.adaptiveRegressions || 0),
        schedulerBacklog: (after.schedulerBacklog || 0) - (before.schedulerBacklog || 0),
        maxSaturation: Number(((after.maxSaturation || 0) - (before.maxSaturation || 0)).toFixed(2)),
      },
      impact: {
        improved:
          (after.failedRuns || 0) <= (before.failedRuns || 0) &&
          (after.adaptiveRegressions || 0) <= (before.adaptiveRegressions || 0) &&
          (after.schedulerBacklog || 0) <= (before.schedulerBacklog || 0),
        regressed:
          (after.failedRuns || 0) > (before.failedRuns || 0) ||
          (after.adaptiveRegressions || 0) > (before.adaptiveRegressions || 0) ||
          (after.schedulerBacklog || 0) > (before.schedulerBacklog || 0),
      },
    };
  }
}

module.exports = { FleetImpactComparator };
