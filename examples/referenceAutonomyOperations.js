const {
  AutonomyEnvelope,
  ApprovalDecisionCache,
  AutonomyBudgetLedger,
  AutonomyBenchmarkSuite,
  FleetHealthMonitor,
  AutonomyFleetSummary,
  ProgressiveAutonomyController,
  AutonomyRolloutGuard,
} = require('../index');

async function main() {
  const envelope = new AutonomyEnvelope({
    budget: { spend: 4, toolCalls: 2, tokens: 800 },
    supervisionPolicy: { reviewThreshold: 0.7, escalateThreshold: 0.5 },
    environment: 'prod',
    tenant: 'acme',
  });

  const approvalCache = new ApprovalDecisionCache({
    entries: [
      {
        id: 'approval-1',
        action: 'send_status_update',
        environment: 'prod',
        tenant: 'acme',
        decision: 'approved',
      },
    ],
  });

  const benchmarkSuite = new AutonomyBenchmarkSuite();
  const benchmarkReport = await benchmarkSuite.run({
    envelope,
    approvalCache,
    approvalLatencyMs: 1200,
    escalation: {
      action: 'review',
      rationale: 'Confidence dipped after a tool retry.',
      confidence: 0.63,
    },
  });

  const ledger = new AutonomyBudgetLedger();
  ledger.record({
    runId: 'autonomy-run-1',
    action: 'review',
    snapshot: envelope.evaluate({
      usage: { spend: 1, toolCalls: 1, tokens: 200 },
      assessment: { confidence: 0.66 },
      riskClass: 'high',
    }).budget,
  });

  const monitor = new FleetHealthMonitor();
  monitor.record({
    environmentId: 'prod',
    tenantId: 'acme',
    runs: 12,
    pausedRuns: 2,
    failedRuns: 1,
    schedulerBacklog: 3,
    saturation: 0.68,
  });

  const fleetSummary = new AutonomyFleetSummary({
    monitor,
    budgetLedger: ledger,
  }).summarize({
    escalations: [
      { environment: 'prod', tenant: 'acme', taskFamily: 'release_review' },
      { environment: 'prod', tenant: 'acme', taskFamily: 'release_review' },
    ],
  });

  const adjustment = new ProgressiveAutonomyController({
    minimumEvidenceScore: 0.8,
  }).adjust(envelope, {
    evidenceScore: 0.91,
    environment: 'prod',
    tenant: 'acme',
    reason: 'attempted autonomy widening before enough evidence',
  });

  const rolloutGuard = new AutonomyRolloutGuard().evaluate({
    adjustment,
    benchmarkReport,
    minimumEvidenceScore: 0.95,
  });

  console.log('Autonomy operations summary');
  console.dir(
    {
      benchmarkReport,
      fleetSummary,
      adjustment,
      rolloutGuard,
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
