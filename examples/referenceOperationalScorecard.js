const {
  Run,
  OperatorSummary,
  MemoryGovernanceDiagnostics,
  OperationalScorecard,
} = require('../index');

async function main() {
  const completedRun = new Run({ id: 'run-1', input: 'healthy' });
  completedRun.setStatus('completed');

  const failedRun = new Run({ id: 'run-2', input: 'failed' });
  failedRun.setStatus('failed');

  const waitingRun = new Run({ id: 'run-3', input: 'approval' });
  waitingRun.setStatus('waiting_for_approval');

  const operatorSummary = new OperatorSummary().summarize({
    runs: [
      { id: completedRun.id, status: completedRun.status },
      { id: failedRun.id, status: failedRun.status },
      { id: waitingRun.id, status: waitingRun.status },
    ],
    incidents: [{ id: 'incident-1' }],
    rollouts: [{ action: 'rollback_recommended' }],
    learnedChanges: [{ id: 'change-1', status: 'pending_review' }],
    assuranceReports: [{ summary: { verdict: 'block' } }],
  });

  const memoryDiagnostics = new MemoryGovernanceDiagnostics().summarize({
    auditView: { blocked: 1, conflicts: 1, retentionActions: 0 },
    benchmarkReport: { failed: 1 },
    stateSummary: { memoryContractSurfaces: ['runtime', 'workflow', 'coordination'] },
  });

  const routingSummary = {
    degraded: 1,
    drifted: 2,
  };

  const governanceSummary = {
    blocked: 1,
    rollbackRecommendations: 1,
  };

  const scorecard = new OperationalScorecard().evaluate({
    runs: [
      { id: completedRun.id, status: completedRun.status },
      { id: failedRun.id, status: failedRun.status },
      { id: waitingRun.id, status: waitingRun.status },
    ],
    governance: governanceSummary,
    memory: memoryDiagnostics,
    routing: routingSummary,
    operator: operatorSummary,
  });

  console.log('Operational scorecard summary');
  console.dir(
    {
      operatorSummary,
      memoryDiagnostics,
      routingSummary,
      governanceSummary,
      scorecard,
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
