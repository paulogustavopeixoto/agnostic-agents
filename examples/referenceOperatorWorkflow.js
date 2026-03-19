const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  Run,
  FileRunStore,
  RunTreeInspector,
  IncidentDebugger,
  TraceDiffer,
  TraceSerializer,
  RunInspector,
  AssuranceReport,
  FleetRolloutPlan,
  FleetImpactComparator,
  FleetRollbackAdvisor,
  OperatorSummary,
  OperatorInterventionPlanner,
  OperatorTriageWorkflow,
  GovernanceRecordLedger,
  AuditStitcher,
  GovernanceTimeline,
} = require('../index');

async function seedRuns(store) {
  const root = new Run({ input: 'operator workflow root' });
  root.setStatus('completed');

  const healthyChild = new Run({
    input: 'healthy child',
    metadata: {
      lineage: {
        rootRunId: root.id,
        parentRunId: root.id,
      },
    },
  });
  healthyChild.addStep({
    id: `${healthyChild.id}:step:1`,
    type: 'tool',
    status: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    durationMs: 2,
  });
  healthyChild.setStatus('completed');

  const failedChild = new Run({
    input: 'failed child',
    metadata: {
      lineage: {
        rootRunId: root.id,
        parentRunId: root.id,
      },
    },
  });
  failedChild.addStep({
    id: `${failedChild.id}:step:1`,
    type: 'tool',
    status: 'failed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    durationMs: 3,
    error: { name: 'ToolExecutionError', message: 'Remote system timed out.' },
  });
  failedChild.addCheckpoint({
    id: `${failedChild.id}:checkpoint:1`,
    label: 'tool_failed',
    status: 'failed',
    snapshot: failedChild.createCheckpointSnapshot(),
  });
  failedChild.addError({ name: 'ToolExecutionError', message: 'Remote system timed out.' });
  failedChild.setStatus('failed');

  await store.saveRun(root);
  await store.saveRun(healthyChild);
  await store.saveRun(failedChild);

  return { root, healthyChild, failedChild };
}

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'agnostic-operator-workflow-'));
  const runStore = new FileRunStore({ directory });
  const { root, healthyChild, failedChild } = await seedRuns(runStore);

  const runTreeInspector = new RunTreeInspector({ runStore });
  const incidentDebugger = new IncidentDebugger({ runStore });
  const operatorSummary = new OperatorSummary();
  const interventionPlanner = new OperatorInterventionPlanner();
  const triageWorkflow = new OperatorTriageWorkflow({
    summary: operatorSummary,
    planner: interventionPlanner,
  });
  const governanceLedger = new GovernanceRecordLedger();
  const auditStitcher = new AuditStitcher({ ledger: governanceLedger });
  const governanceTimeline = new GovernanceTimeline({ ledger: governanceLedger });

  const rootTree = await RunTreeInspector.build(runStore, { rootRunId: root.id });
  const report = await incidentDebugger.createReport(failedChild.id, {
    compareToRunId: healthyChild.id,
  });
  const diff = TraceDiffer.diff(healthyChild, failedChild);
  const partialTrace = TraceSerializer.exportPartialRun(failedChild, {
    checkpointId: `${failedChild.id}:checkpoint:1`,
  });
  const assuranceReport = new AssuranceReport({
    candidateId: 'runtime-rollout-1',
    verdict: 'block',
    violations: [
      {
        id: 'failed-run-invariant',
        surface: 'runtime',
        reason: 'A failed child run is still unresolved.',
      },
    ],
  });
  const rollbackAdvice = new FleetRollbackAdvisor({
    comparator: new FleetImpactComparator(),
  }).advise({
    plan: new FleetRolloutPlan({
      target: { id: 'runtime-rollout-1', version: '1.4.0' },
      stages: [{ id: 'canary', percentage: 10 }],
    }),
    comparison: {
      impact: { regressed: true },
      delta: { failedRuns: 1, adaptiveRegressions: 0, schedulerBacklog: 2 },
    },
    safetyDecision: { action: 'halt' },
  });
  const summary = operatorSummary.summarize({
    runs: [RunInspector.summarize(root), RunInspector.summarize(healthyChild), RunInspector.summarize(failedChild)],
    incidents: [report],
    rollouts: [rollbackAdvice],
    learnedChanges: [{ id: 'learned-change-1', status: 'pending_review' }],
    assuranceReports: [assuranceReport.toJSON()],
  });
  const intervention = interventionPlanner.plan({
    run: failedChild,
    incident: report,
    assurance: assuranceReport.toJSON(),
    rollout: { action: 'halt' },
    rollback: rollbackAdvice,
  });
  const triage = triageWorkflow.run({
    runs: [RunInspector.summarize(root), RunInspector.summarize(healthyChild), RunInspector.summarize(failedChild)],
    incidents: [report],
    rollouts: [rollbackAdvice],
    learnedChanges: [{ id: 'learned-change-1', status: 'pending_review' }],
    assuranceReports: [assuranceReport.toJSON()],
    primaryRun: failedChild,
    primaryIncident: report,
    primaryAssurance: assuranceReport.toJSON(),
    primaryRollout: { action: 'halt' },
    primaryRollback: rollbackAdvice,
    context: { scope: 'cross-runtime-triage' },
  });
  const correlationId = 'major-change-1';
  governanceLedger.record({
    surface: 'policy',
    action: 'promote',
    correlationId,
    candidateId: 'runtime-rollout-1',
    summary: 'Promoted the runtime policy pack for staged rollout.',
    status: 'completed',
    actorId: 'operator-1',
  });
  governanceLedger.record({
    surface: 'learning',
    action: 'approve_change',
    correlationId,
    candidateId: 'runtime-rollout-1',
    summary: 'Approved a learned routing change after review.',
    status: 'completed',
    actorId: 'operator-1',
  });
  governanceLedger.record({
    surface: 'rollout',
    action: 'start_canary',
    correlationId,
    candidateId: 'runtime-rollout-1',
    runId: failedChild.id,
    summary: 'Started a 10% canary rollout.',
    status: 'running',
  });
  governanceLedger.record({
    surface: 'replay',
    action: 'partial_replay',
    correlationId,
    candidateId: 'runtime-rollout-1',
    runId: failedChild.id,
    summary: 'Replayed the failed child run from the last failure checkpoint.',
    status: 'completed',
  });
  governanceLedger.record({
    surface: 'rollback',
    action: 'rollback_rollout',
    correlationId,
    candidateId: 'runtime-rollout-1',
    runId: failedChild.id,
    summary: 'Rolled back the canary after fleet regression signals.',
    status: 'completed',
  });
  const stitchedAudit = auditStitcher.stitch({ correlationId });
  const timeline = governanceTimeline.build({ correlationId });

  console.log('Run summary:');
  console.dir(RunInspector.summarize(failedChild), { depth: null });

  console.log('\nRendered run tree:');
  console.log(RunTreeInspector.render(rootTree));

  console.log('\nIncident report:');
  console.dir(report, { depth: null });

  console.log('\nOperator summary:');
  console.dir(summary, { depth: null });

  console.log('\nOperator intervention plan:');
  console.dir(intervention, { depth: null });

  console.log('\nOperator triage workflow:');
  console.dir(triage, { depth: null });

  console.log('\nGovernance ledger summary:');
  console.dir(governanceLedger.summarize(), { depth: null });

  console.log('\nStitched audit chain:');
  console.dir(stitchedAudit, { depth: null });

  console.log('\nGovernance timeline:');
  console.log(governanceTimeline.render(timeline));

  console.log('\nHealthy vs failed diff:');
  console.dir(diff, { depth: null });

  console.log('\nPartial trace export metadata:');
  console.dir(partialTrace.metadata, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
