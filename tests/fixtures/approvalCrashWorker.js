const fs = require('fs/promises');
const path = require('path');
const { Agent, Tool, FileRunStore, FileRunLock, RetryManager } = require('../..');

async function main() {
  const [directory, phase] = process.argv.slice(2);
  const store = new FileRunStore({ directory: path.join(directory, 'runs') });
  const hold = () => {
    process.stdout.write('READY');
    setInterval(() => {}, 1000);
    return new Promise(() => {});
  };
  if (phase === 'before') {
    const save = store.saveRun.bind(store);
    store.saveRun = async run => {
      const result = await save(run);
      if (Object.values(run.state.approvalConsumptions || {}).some(entry => entry.status === 'uncertain')) await hold();
      return result;
    };
  }
  const agent = new Agent({ generateText: async () => ({ toolCalls: [{ name: 'write', arguments: {} }] }) }, {
    runStore: store, runLock: new FileRunLock({ directory: path.join(directory, 'locks') }),
    retryManager: new RetryManager({ retries: 0 }), toolPolicy: { defaultAction: 'require_approval' },
    tools: [new Tool({ name: 'write', metadata: { sideEffectLevel: 'external_write' }, implementation: async () => {
      await fs.appendFile(path.join(directory, 'action.txt'), 'performed\n', { mode: 0o600 });
      await hold();
    } })],
  });
  const pending = await agent.run('write', { runId: 'approval-crash' });
  await agent.resumeRun(pending.id, { approved: true });
}

main().catch(() => { process.exitCode = 1; });
