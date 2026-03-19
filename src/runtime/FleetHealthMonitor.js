class FleetHealthMonitor {
  constructor({ snapshots = [] } = {}) {
    this.snapshots = Array.isArray(snapshots) ? [...snapshots] : [];
  }

  record(snapshot = {}) {
    const normalized = {
      timestamp: snapshot.timestamp || new Date().toISOString(),
      environmentId: snapshot.environmentId || 'default',
      tenantId: snapshot.tenantId || null,
      runs: Number.isFinite(snapshot.runs) ? snapshot.runs : 0,
      failedRuns: Number.isFinite(snapshot.failedRuns) ? snapshot.failedRuns : 0,
      pausedRuns: Number.isFinite(snapshot.pausedRuns) ? snapshot.pausedRuns : 0,
      adaptiveRegressions: Number.isFinite(snapshot.adaptiveRegressions) ? snapshot.adaptiveRegressions : 0,
      schedulerBacklog: Number.isFinite(snapshot.schedulerBacklog) ? snapshot.schedulerBacklog : 0,
      saturation: Number.isFinite(snapshot.saturation) ? snapshot.saturation : 0,
    };

    this.snapshots.push(normalized);
    return normalized;
  }

  summarize() {
    const totals = this.snapshots.reduce(
      (summary, snapshot) => {
        summary.runs += snapshot.runs;
        summary.failedRuns += snapshot.failedRuns;
        summary.pausedRuns += snapshot.pausedRuns;
        summary.adaptiveRegressions += snapshot.adaptiveRegressions;
        summary.schedulerBacklog += snapshot.schedulerBacklog;
        summary.maxSaturation = Math.max(summary.maxSaturation, snapshot.saturation);
        summary.environments.add(snapshot.environmentId);
        if (snapshot.tenantId) {
          summary.tenants.add(snapshot.tenantId);
        }
        return summary;
      },
      {
        runs: 0,
        failedRuns: 0,
        pausedRuns: 0,
        adaptiveRegressions: 0,
        schedulerBacklog: 0,
        maxSaturation: 0,
        environments: new Set(),
        tenants: new Set(),
      }
    );

    return {
      snapshots: this.snapshots.length,
      runs: totals.runs,
      failedRuns: totals.failedRuns,
      pausedRuns: totals.pausedRuns,
      adaptiveRegressions: totals.adaptiveRegressions,
      schedulerBacklog: totals.schedulerBacklog,
      maxSaturation: totals.maxSaturation,
      environments: totals.environments.size,
      tenants: totals.tenants.size,
    };
  }
}

module.exports = { FleetHealthMonitor };
