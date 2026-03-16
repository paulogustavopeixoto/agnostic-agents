const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  Run,
  FileRunStore,
  IncidentDebugger,
  TraceSerializer,
} = require('../index');

async function seedRuns(store) {
  const root = new Run({ input: 'root incident' });
  root.setStatus('completed');

  const child = new Run({
    input: 'child incident',
    metadata: {
      lineage: {
        rootRunId: root.id,
        parentRunId: root.id,
      },
    },
  });

  child.addStep({
    id: `${child.id}:step:1`,
    type: 'tool',
    status: 'failed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    durationMs: 3,
  });
  child.addError({ name: 'ToolExecutionError', message: 'External update failed.' });
  child.addCheckpoint({
    id: 'cp-failed',
    label: 'tool_failed',
    status: 'failed',
    snapshot: child.createCheckpointSnapshot(),
  });
  child.setStatus('failed');

  await store.saveRun(root);
  await store.saveRun(child);
  return { root, child };
}

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'agnostic-incident-'));
  const runStore = new FileRunStore({ directory });
  const { child } = await seedRuns(runStore);

  const debuggerInstance = new IncidentDebugger({ runStore });
  const report = await debuggerInstance.createReport(child.id);
  const trace = TraceSerializer.exportBundle(await runStore.listRuns(), {
    exportedFor: 'incident-debug',
  });

  console.dir(report, { depth: null });
  console.log('\nPortable trace bundle:');
  console.dir(trace, { depth: 2 });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
