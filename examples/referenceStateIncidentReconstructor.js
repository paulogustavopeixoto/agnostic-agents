const {
  Run,
  StateBundle,
  StateIncidentReconstructor,
} = require('../index');

async function main() {
  const run = new Run({
    input: 'Reconstruct this incident from portable state.',
    status: 'failed',
    state: {
      assessment: {
        confidence: 0.41,
      },
    },
    messages: [
      { role: 'user', content: 'Reconstruct this incident from portable state.' },
    ],
    steps: [
      {
        id: 'run-step-1',
        type: 'tool',
        status: 'failed',
      },
    ],
    errors: [
      {
        name: 'ToolExecutionError',
        message: 'send_status_update timed out',
      },
    ],
    pendingPause: {
      stage: 'replay',
      reason: 'Prepared for offline replay investigation.',
    },
    metadata: {
      lineage: {
        rootRunId: 'incident-root',
        parentRunId: null,
        childRunIds: [],
        branchOriginRunId: null,
        branchCheckpointId: null,
      },
    },
  });
  run.addCheckpoint({
    id: `${run.id}:checkpoint:1`,
    label: 'run_failed',
    status: 'failed',
    snapshot: run.createCheckpointSnapshot(),
  });

  const bundle = new StateBundle({
    run,
    memory: {
      working: {
        active_task: 'incident-reconstruction',
      },
      semantic: {
        last_incident: 'send-status-timeout',
      },
    },
    metadata: {
      purpose: 'offline-incident-demo',
    },
  });

  const reconstructor = new StateIncidentReconstructor();
  const report = reconstructor.reconstruct(bundle);

  console.log('State incident reconstruction summary:');
  console.dir(
    {
      runId: report.runId,
      status: report.status,
      failedSteps: report.failedSteps.length,
      memoryLayers: report.memoryLayers,
    },
    { depth: null }
  );

  console.log('\nState incident reconstruction report:');
  console.dir(report, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
