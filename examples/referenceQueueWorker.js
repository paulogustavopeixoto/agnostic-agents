const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  Agent,
  FileRunStore,
  QueueEnvironmentAdapter,
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

async function createWorker() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'agnostic-queue-worker-'));
  const runStore = new FileRunStore({ directory });
  const queue = [];
  const queueAdapter = new QueueEnvironmentAdapter({ name: 'runtime-job-queue' });

  const producer = new Agent(createAdapter('producer'), { runStore });
  const worker = new Agent(createAdapter('worker'), { runStore });

  async function enqueue(payload) {
    queue.push(payload);
    return { queued: true, queueLength: queue.length };
  }

  async function processNextMessage() {
    const payload = queue.shift();
    if (!payload) {
      return null;
    }

    const run = await worker.continueDistributedRun(payload.envelope);
    return {
      queue: payload.queue,
      runId: run.id,
      summary: RunInspector.summarize(run),
    };
  }

  async function createQueuedRun(input) {
    const run = await producer.run(input);
    const envelope = await producer.createDistributedEnvelope(run.id, {
      action: 'replay',
      checkpointId: run.checkpoints[run.checkpoints.length - 1].id,
      metadata: {
        queue: queueAdapter.name || 'runtime-job-queue',
        transport: 'queue',
      },
    });

    await enqueue({
      queue: queueAdapter.name || 'runtime-job-queue',
      envelope,
    });

    return { run, envelope };
  }

  return {
    queue,
    queueAdapter,
    producer,
    worker,
    runStore,
    enqueue,
    processNextMessage,
    createQueuedRun,
  };
}

async function main() {
  const queueWorker = await createWorker();
  const { run, envelope } = await queueWorker.createQueuedRun('Prepare the queued continuation.');
  const remoteResult = await queueWorker.processNextMessage();

  console.log('Queued envelope:');
  console.dir(envelope, { depth: null });

  console.log('\nProducer run summary:');
  console.dir(RunInspector.summarize(run), { depth: null });

  console.log('\nRemote worker result:');
  console.dir(remoteResult, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { createWorker };
