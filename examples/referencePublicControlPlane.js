const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  Run,
  FileRunStore,
  IncidentDebugger,
  RunTreeInspector,
  TraceDiffer,
  TraceSerializer,
} = require('../index');

async function seedRuns(runStore) {
  const root = new Run({ input: 'root workflow run' });
  root.output = 'Root workflow completed.';
  root.addCheckpoint({
    id: `${root.id}:checkpoint:1`,
    label: 'run_completed',
    status: 'completed',
    snapshot: root.createCheckpointSnapshot(),
  });
  root.setStatus('completed');

  const healthyChild = new Run({
    input: 'healthy delegated run',
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
    output: { delivered: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    durationMs: 2,
  });
  healthyChild.addCheckpoint({
    id: `${healthyChild.id}:checkpoint:1`,
    label: 'tool_completed',
    status: 'running',
    snapshot: healthyChild.createCheckpointSnapshot(),
  });
  healthyChild.output = 'Healthy delegated update delivered.';
  healthyChild.setStatus('completed');

  const failedChild = new Run({
    input: 'failing delegated run',
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
    output: { delivered: false },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    durationMs: 3,
  });
  failedChild.addError({
    name: 'ToolExecutionError',
    message: 'Status update delivery failed.',
  });
  failedChild.addCheckpoint({
    id: `${failedChild.id}:checkpoint:1`,
    label: 'tool_failed',
    status: 'failed',
    snapshot: failedChild.createCheckpointSnapshot(),
  });
  failedChild.setStatus('failed');

  await runStore.saveRun(root);
  await runStore.saveRun(healthyChild);
  await runStore.saveRun(failedChild);

  return { root, healthyChild, failedChild };
}

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'agnostic-public-control-plane-'));
  const runStore = new FileRunStore({ directory });
  const { root, healthyChild, failedChild } = await seedRuns(runStore);

  const runTree = await RunTreeInspector.build(runStore, { rootRunId: root.id });
  const incidentDebugger = new IncidentDebugger({ runStore });
  const incidentReport = await incidentDebugger.createReport(failedChild.id, {
    compareToRunId: healthyChild.id,
  });
  const traceDiff = TraceDiffer.diff(healthyChild, failedChild);
  const traceBundle = TraceSerializer.exportBundle(await runStore.listRuns(), {
    exportedFor: 'public-control-plane-reference',
  });

  console.log('Public control-plane snapshot:');
  console.dir(
    {
      rootDirectory: directory,
      rootRunId: root.id,
      runStatuses: traceBundle.index,
      incidentRunId: failedChild.id,
      comparisonRunId: healthyChild.id,
      treeMetrics: runTree?.subtreeMetrics || null,
      renderedTree: RunTreeInspector.render(runTree),
      incidentSummary: {
        status: incidentReport.status,
        failure: incidentReport.failure?.message || null,
        recommendations: incidentReport.recommendations,
      },
      traceDiffSummary: {
        statusChanged: traceDiff.statusChanged,
        outputChanged: traceDiff.outputChanged,
        firstDivergingStepIndex: traceDiff.firstDivergingStepIndex,
        eventTypesAdded: traceDiff.eventTypesAdded,
      },
      exportedBundle: {
        format: traceBundle.format,
        schemaVersion: traceBundle.schemaVersion,
        runs: traceBundle.index.length,
      },
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
