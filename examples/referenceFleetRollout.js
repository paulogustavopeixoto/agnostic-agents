const {
  FleetRolloutPlan,
  FleetHealthMonitor,
  FleetCanaryEvaluator,
  FleetSafetyController,
  FleetImpactComparator,
  FleetRollbackAdvisor,
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

  console.log('Fleet rollout summary:');
  console.dir(
    {
      plan: plan.summarize(),
      health: monitor.summarize(),
      decision,
      safety,
      comparison,
      rollbackAdvice,
    },
    { depth: null }
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
