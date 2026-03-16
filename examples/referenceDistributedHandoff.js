const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  Agent,
  FileRunStore,
  RunInspector,
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
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'agnostic-distributed-handoff-'));
  const runStore = new FileRunStore({ directory });

  const originAgent = new Agent(createAdapter('origin'), { runStore });
  const remoteAgent = new Agent(createAdapter('remote'), { runStore });

  const initialRun = await originAgent.run('Prepare the distributed handoff payload.');
  const handoffEnvelope = await originAgent.createDistributedEnvelope(initialRun.id, {
    action: 'replay',
    checkpointId: initialRun.checkpoints[initialRun.checkpoints.length - 1].id,
    metadata: {
      handoffTarget: 'runtime-worker-b',
      transport: 'service_call',
    },
  });

  const remoteRun = await remoteAgent.continueDistributedRun(handoffEnvelope);

  console.log('Distributed handoff envelope:');
  console.dir(handoffEnvelope, { depth: null });

  console.log('\nOrigin run summary:');
  console.dir(RunInspector.summarize(initialRun), { depth: null });

  console.log('\nRemote continuation summary:');
  console.dir(RunInspector.summarize(remoteRun), { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
