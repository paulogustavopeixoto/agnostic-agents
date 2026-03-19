const {
  GovernanceRecordLedger,
  GovernanceTimeline,
  OperatorDashboardSnapshot,
  OperatorControlLoop,
} = require('../index');

function main() {
  const ledger = new GovernanceRecordLedger();
  ledger.record({
    surface: 'rollout',
    action: 'start_canary',
    correlationId: 'operator-dashboard-1',
    candidateId: 'runtime-rollout-2',
    summary: 'Started a 5% rollout.',
    status: 'running',
  });
  ledger.record({
    surface: 'assurance',
    action: 'block_rollout',
    correlationId: 'operator-dashboard-1',
    candidateId: 'runtime-rollout-2',
    summary: 'Blocked rollout after invariant failure.',
    status: 'completed',
  });

  const timeline = new GovernanceTimeline({ ledger });
  const dashboard = new OperatorDashboardSnapshot({ timeline });
  const controlLoop = new OperatorControlLoop({ dashboard });

  const payload = {
    runs: [{ status: 'failed' }, { status: 'completed' }],
    incidents: [{ id: 'incident-1' }],
    rollouts: [{ action: 'rollback_recommended' }],
    learnedChanges: [{ id: 'change-1', status: 'pending_review' }],
    assuranceReports: [{ verdict: 'block' }],
    governance: { correlationId: 'operator-dashboard-1' },
    primaryIncident: { recommendedAction: 'branch_from_failure_checkpoint' },
    primaryAssurance: { verdict: 'block' },
    primaryRollout: { action: 'halt' },
    primaryRollback: { action: 'rollback_recommended' },
    context: { scope: 'operator-dashboard-loop' },
  };

  console.log('Operator dashboard snapshot:');
  console.dir(dashboard.build(payload), { depth: null });

  console.log('\nOperator control loop:');
  console.dir(controlLoop.run(payload), { depth: null });
}

if (require.main === module) {
  main();
}
