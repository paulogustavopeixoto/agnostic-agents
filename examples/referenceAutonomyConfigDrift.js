const {
  AutonomyStackConfig,
  AutonomyStackComparator,
  AutonomyDriftGuard,
} = require('../index');

async function main() {
  const baseline = new AutonomyStackConfig({
    id: 'prod-baseline',
    environment: 'prod',
    tenant: 'acme',
    routing: { primaryModel: 'code-model', fallbackModel: 'cheap-model' },
    policy: { approvalMode: 'required', maxRisk: 'medium' },
    memory: { retentionDays: 30, trustZone: 'private' },
    autonomy: { maxSpend: 5, reviewThreshold: 0.7 },
    fleet: { canaryPercent: 10 },
    operator: { reviewDashboard: 'v2' },
  });

  const candidate = new AutonomyStackConfig({
    id: 'prod-candidate',
    environment: 'prod',
    tenant: 'acme',
    routing: { primaryModel: 'code-model-v2', fallbackModel: 'cheap-model' },
    policy: { approvalMode: 'auto', maxRisk: 'high' },
    memory: { retentionDays: 30, trustZone: 'private' },
    autonomy: { maxSpend: 8, reviewThreshold: 0.6 },
    fleet: { canaryPercent: 25 },
    operator: { reviewDashboard: 'v2' },
  });

  const comparison = new AutonomyStackComparator().compare(baseline, candidate);
  const driftGuard = new AutonomyDriftGuard().evaluate(comparison, {
    blockedSections: ['policy'],
    maxChanges: 5,
  });

  console.log('Autonomy config drift summary');
  console.dir(
    {
      comparison,
      driftGuard,
    },
    { depth: null }
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
