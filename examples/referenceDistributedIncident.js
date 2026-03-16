const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  Agent,
  FileRunStore,
  IncidentDebugger,
  TraceCorrelation,
  TraceSerializer,
} = require('../index');

function createAdapter(label) {
  return {
    getCapabilities: () => ({ generateText: true, toolCalling: false }),
    generateText: async messages => ({
      message: `${label}: ${messages[messages.length - 1].content}`,
    }),
  };
}

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'agnostic-distributed-incident-'));
  const runStore = new FileRunStore({ directory });

  const serviceAgent = new Agent(createAdapter('service-a'), { runStore });
  const workerAgent = new Agent(createAdapter('worker-b'), { runStore });

  const sourceRun = await serviceAgent.run('Prepare a distributed incident example.');
  const envelope = await serviceAgent.createDistributedEnvelope(sourceRun.id, {
    action: 'replay',
    checkpointId: sourceRun.checkpoints[sourceRun.checkpoints.length - 1].id,
    metadata: TraceCorrelation.annotateMetadata(
      {
        transport: 'queue',
        queue: 'runtime-job-queue',
        workerId: 'worker-b',
      },
      TraceCorrelation.fromRun(sourceRun, {
        originService: 'service-a',
      })
    ),
  });

  const correlatedEnvelope = {
    ...envelope,
    metadata: TraceCorrelation.annotateMetadata(
      envelope.metadata,
      TraceCorrelation.fromEnvelope(envelope, {
        destinationWorker: 'worker-b',
      })
    ),
  };

  const remoteRun = await workerAgent.continueDistributedRun(correlatedEnvelope);
  remoteRun.setStatus('failed');
  remoteRun.addError({ name: 'QueueWorkerError', message: 'Simulated remote continuation failure.' });
  await runStore.saveRun(remoteRun);

  const debuggerInstance = new IncidentDebugger({ runStore });
  const report = await debuggerInstance.createReport(remoteRun.id, {
    compareToRunId: sourceRun.id,
  });
  const traceBundle = TraceSerializer.exportBundle(await runStore.listRuns(), {
    exportedFor: 'distributed-incident-debug',
    correlation: TraceCorrelation.fromRun(remoteRun, {
      destinationWorker: 'worker-b',
    }),
  });

  console.log('Distributed incident report:');
  console.dir(report, { depth: null });

  console.log('\nCorrelation metadata:');
  console.dir(correlatedEnvelope.metadata.correlation, { depth: null });

  console.log('\nDistributed trace bundle metadata:');
  console.dir(traceBundle.metadata, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
