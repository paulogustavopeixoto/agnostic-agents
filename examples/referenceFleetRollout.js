const {
  FleetRolloutPlan,
  FleetHealthMonitor,
  FleetCanaryEvaluator,
  FleetSafetyController,
  FleetImpactComparator,
  FleetRollbackAdvisor,
  RouteFleetDiagnostics,
} = require('../index');

async function main() {
  const plan = new FleetRolloutPlan({
    target: {
      id: 'learning-pack:v14-canary',
      type: 'learned_change_bundle',
      version: '14.0.0-canary',
    },
    stages: [
      {
        percentage: 10,
        scope: 'environment',
        environmentIds: ['staging'],
        description: 'Canary rollout in staging.',
      },
      {
        percentage: 50,
        scope: 'tenant',
        tenantIds: ['tenant-a', 'tenant-b'],
        description: 'Expanded tenant rollout.',
      },
    ],
    rollbackTriggers: [
      {
        metric: 'adaptiveRegressions',
        operator: '>',
        threshold: 0,
      },
    ],
  });

  const before = new FleetHealthMonitor();
  before.record({
    environmentId: 'staging',
    tenantId: 'tenant-a',
    runs: 20,
    failedRuns: 2,
    adaptiveRegressions: 1,
    schedulerBacklog: 3,
    saturation: 0.71,
    routeMetrics: [
      {
        routeId: 'coding-route',
        selectedCount: 14,
        degraded: false,
        saturation: 0.58,
        driftScore: 0.18,
        fallbackRate: 0.07,
      },
    ],
  });

  const monitor = new FleetHealthMonitor();
  monitor.record({
    environmentId: 'staging',
    tenantId: 'tenant-a',
    runs: 24,
    failedRuns: 1,
    adaptiveRegressions: 1,
    schedulerBacklog: 2,
    saturation: 0.62,
    routeMetrics: [
      {
        routeId: 'coding-route',
        selectedCount: 16,
        degraded: true,
        saturation: 0.84,
        driftScore: 0.57,
        fallbackRate: 0.31,
      },
      {
        routeId: 'verification-route',
        selectedCount: 8,
        degraded: false,
        saturation: 0.49,
        driftScore: 0.16,
        fallbackRate: 0.04,
      },
    ],
  });

  const evaluator = new FleetCanaryEvaluator({ monitor });
  const decision = evaluator.evaluate(plan);
  const comparator = new FleetImpactComparator({
    before,
    after: monitor,
  });
  const comparison = comparator.compare();
  const controller = new FleetSafetyController({
    monitor,
    maxConcurrentRuns: 20,
    maxSchedulerBacklog: 1,
    maxAdaptiveRegressions: 0,
    maxSaturation: 0.6,
    allowedEnvironmentIds: ['staging'],
    allowedTenantIds: ['tenant-a'],
  });
  const safety = controller.evaluate(null, {
    environmentId: 'staging',
    tenantId: 'tenant-a',
  });
  const rollbackAdvisor = new FleetRollbackAdvisor({ comparator });
  const rollbackAdvice = rollbackAdvisor.advise({
    plan,
    comparison,
    safetyDecision: safety,
  });
  const routeDiagnostics = new RouteFleetDiagnostics({ monitor }).analyze();

  console.log('Fleet rollout summary:');
  console.dir(
    {
      plan: plan.summarize(),
      health: monitor.summarize(),
      decision,
      safety,
      comparison,
      routeDiagnostics,
      rollbackAdvice,
    },
    { depth: null }
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
