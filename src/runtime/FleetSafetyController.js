const { FleetHealthMonitor } = require('./FleetHealthMonitor');

class FleetSafetyController {
  constructor({
    monitor = null,
    maxConcurrentRuns = null,
    maxSchedulerBacklog = null,
    maxAdaptiveRegressions = 0,
    maxSaturation = 1,
    allowedEnvironmentIds = [],
    allowedTenantIds = [],
  } = {}) {
    this.monitor = monitor instanceof FleetHealthMonitor ? monitor : new FleetHealthMonitor(monitor || {});
    this.maxConcurrentRuns = Number.isFinite(maxConcurrentRuns) ? maxConcurrentRuns : null;
    this.maxSchedulerBacklog = Number.isFinite(maxSchedulerBacklog) ? maxSchedulerBacklog : null;
    this.maxAdaptiveRegressions = Number.isFinite(maxAdaptiveRegressions) ? maxAdaptiveRegressions : 0;
    this.maxSaturation = Number.isFinite(maxSaturation) ? maxSaturation : 1;
    this.allowedEnvironmentIds = new Set(allowedEnvironmentIds);
    this.allowedTenantIds = new Set(allowedTenantIds);
  }

  evaluate(summary = null, scope = {}) {
    const fleet = summary || this.monitor.summarize();
    const reasons = [];

    if (this.maxConcurrentRuns !== null && fleet.runs > this.maxConcurrentRuns) {
      reasons.push(`Fleet runs ${fleet.runs} exceed the concurrency budget ${this.maxConcurrentRuns}.`);
    }
    if (this.maxSchedulerBacklog !== null && fleet.schedulerBacklog > this.maxSchedulerBacklog) {
      reasons.push(
        `Scheduler backlog ${fleet.schedulerBacklog} exceeds the fleet backlog budget ${this.maxSchedulerBacklog}.`
      );
    }
    if (fleet.adaptiveRegressions > this.maxAdaptiveRegressions) {
      reasons.push(
        `Adaptive regressions ${fleet.adaptiveRegressions} exceed the fleet risk budget ${this.maxAdaptiveRegressions}.`
      );
    }
    if (fleet.maxSaturation > this.maxSaturation) {
      reasons.push(`Fleet saturation ${fleet.maxSaturation} exceeds the safety threshold ${this.maxSaturation}.`);
    }
    if (scope.environmentId && this.allowedEnvironmentIds.size > 0 && !this.allowedEnvironmentIds.has(scope.environmentId)) {
      reasons.push(`Environment "${scope.environmentId}" is outside the allowed rollout boundary.`);
    }
    if (scope.tenantId && this.allowedTenantIds.size > 0 && !this.allowedTenantIds.has(scope.tenantId)) {
      reasons.push(`Tenant "${scope.tenantId}" is outside the allowed rollout boundary.`);
    }

    let action = 'allow';
    if (reasons.some(reason => reason.includes('risk budget') || reason.includes('outside the allowed rollout boundary'))) {
      action = 'halt';
    } else if (reasons.length) {
      action = 'throttle';
    }

    return {
      action,
      reasons,
      budgets: {
        maxConcurrentRuns: this.maxConcurrentRuns,
        maxSchedulerBacklog: this.maxSchedulerBacklog,
        maxAdaptiveRegressions: this.maxAdaptiveRegressions,
        maxSaturation: this.maxSaturation,
      },
      scope: {
        environmentId: scope.environmentId || null,
        tenantId: scope.tenantId || null,
      },
      summary: fleet,
    };
  }
}

module.exports = { FleetSafetyController };
