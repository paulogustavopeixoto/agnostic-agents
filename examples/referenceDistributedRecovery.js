const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  Agent,
  FileRunStore,
  DistributedRecoveryPlanner,
  DistributedRecoveryRunner,
  TraceCorrelation,
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
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'agnostic-distributed-recovery-'));
  const runStore = new FileRunStore({ directory });

  const serviceAgent = new Agent(createAdapter('service-a'), { runStore });
  const workerAgent = new Agent(createAdapter('worker-b'), { runStore });

  const sourceRun = await serviceAgent.run('Prepare a distributed recovery example.');
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

  const remoteRun = await workerAgent.continueDistributedRun(envelope);
  remoteRun.setStatus('failed');
  remoteRun.addStep({
    id: `${remoteRun.id}:step:recovery-target`,
    type: 'tool',
    status: 'failed',
    output: null,
  });
  remoteRun.addError({ name: 'QueueWorkerError', message: 'Simulated distributed recovery failure.' });
  await runStore.saveRun(remoteRun);

  const planner = new DistributedRecoveryPlanner({ runStore });
  const runner = new DistributedRecoveryRunner({
    runStore,
    agentRuntime: workerAgent,
    approvalDecider: async () => ({
      approved: true,
      reason: 'approved by distributed recovery operator',
    }),
  });
  const plan = await planner.createPlan(remoteRun.id, {
    compareToRunId: sourceRun.id,
  });
  const execution = await runner.executePlan(plan);

  console.log('Distributed recovery plan:');
  console.dir(
    {
      runId: plan.runId,
      status: plan.status,
      recommendedAction: plan.recommendedAction,
      correlation: plan.correlation,
      steps: plan.steps,
    },
    { depth: null }
  );

  console.log('\nExecuted recovery action:');
  console.dir(
    {
      executedAction: execution.executedAction,
      resultStatus: execution.result?.status || null,
      resultRunId: execution.result?.id || null,
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
