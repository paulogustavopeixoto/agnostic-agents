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

  const rootTree = await runTreeInspector.getTree(root.id);
  const report = await incidentDebugger.createReport(failedChild.id, {
    compareToRunId: healthyChild.id,
  });
  const diff = TraceDiffer.diff(healthyChild, failedChild);
  const partialTrace = TraceSerializer.exportPartialRun(failedChild, {
    checkpointId: `${failedChild.id}:checkpoint:1`,
  });

  console.log('Run summary:');
  console.dir(RunInspector.summarize(failedChild), { depth: null });

  console.log('\nRendered run tree:');
  console.log(runTreeInspector.render(rootTree));

  console.log('\nIncident report:');
  console.dir(report, { depth: null });

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
