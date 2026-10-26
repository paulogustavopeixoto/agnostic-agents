const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { Agent, Run, Tool, RunBudget, ApprovalSigner, InMemoryRunLock, FileRunLock,
  InMemoryRunStore, RetryManager } = require('..');

const retryManager = new RetryManager({ retries: 0 });

test('run locks exclude concurrent owners and release after failure', async () => {
  const lock = new InMemoryRunLock();
  let finish;
  const first = lock.withLock('same', () => new Promise(resolve => { finish = resolve; }));
  await expect(lock.withLock('same', async () => {})).rejects.toThrow('already executing');
  finish(); await first;
  await expect(lock.withLock('same', async () => { throw Error('failed'); })).rejects.toThrow('failed');
  expect(await lock.withLock('same', async () => 'released')).toBe('released');
});

test('separate filesystem lock instances coordinate through atomic directory creation', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-lock-'));
  try {
    const a = new FileRunLock({ directory });
    const b = new FileRunLock({ directory });
    await a.withLock('same', async () => {
      await expect(b.withLock('same', async () => {})).rejects.toThrow('locked');
    });
    expect(await b.withLock('same', async () => 'ok')).toBe('ok');
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('signed approval arguments are tamper evident', async () => {
  const signer = new ApprovalSigner({ key: 'test-signing-key-'.repeat(4) });
  const action = jest.fn(async () => 'done');
  const store = new InMemoryRunStore();
  const agent = new Agent({ generateText: async () => ({ toolCalls: [{ name: 'write', arguments: { value: 1 } }] }) }, {
    tools: [new Tool({ name: 'write', implementation: action })], approvalSigner: signer,
    toolPolicy: { defaultAction: 'require_approval' }, runStore: store, retryManager,
  });
  const run = await agent.run('write');
  expect(signer.verify(run.pendingApproval)).toBe(true);
  run.pendingApproval.toolCall.arguments.value = 2;
  run.pendingApproval.arguments.value = 2;
  await store.saveRun(run);
  await expect(agent.resumeRun(run.id, { approved: true })).rejects.toThrow('signature');
  expect(action).not.toHaveBeenCalled();
});

test('approval consumption is persisted before dispatch and concurrent resume cannot dispatch twice', async () => {
  let finish;
  const action = jest.fn(() => new Promise(resolve => { finish = resolve; }));
  const store = new InMemoryRunStore();
  const lock = new InMemoryRunLock();
  const adapter = { generateText: jest.fn().mockResolvedValueOnce({ toolCalls: [{ name: 'write', arguments: {} }] })
    .mockResolvedValue({ message: 'done' }) };
  const options = { tools: [new Tool({ name: 'write', implementation: action })], runStore: store,
    runLock: lock, retryManager, toolPolicy: { defaultAction: 'require_approval' } };
  const a = new Agent(adapter, options);
  const b = new Agent(adapter, options);
  const run = await a.run('write');
  const first = a.resumeRun(run.id, { approved: true });
  // Wait for actual dispatch, not an assumed scheduling delay.
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  const persisted = await store.getRun(run.id);
  expect(persisted.pendingApproval).toBeNull();
  expect(Object.values(persisted.state.approvalConsumptions)[0].status).toBe('uncertain');
  await expect(b.resumeRun(run.id, { approved: true })).rejects.toThrow('already executing');
  finish('done'); await first;
  expect((await b.resumeRun(run.id, { approved: true })).status).toBe('completed');
  expect(action).toHaveBeenCalledTimes(1);
});

test('budgets reserve upper bounds, retain failed work, and deny missing estimates', async () => {
  const run = new Run();
  const budget = new RunBudget({ limits: { tokens: 10, costMicros: 20 }, estimate: async () => ({ tokens: 6, costMicros: 10 }) });
  const reservation = await budget.reserve(run, { operation: 'model' });
  budget.settle(run, reservation, { tokens: 2, costMicros: 3 });
  expect(run.state.resourceBudget.reserved.tokens).toBe(6);
  await expect(budget.reserve(run, { operation: 'retry' })).rejects.toThrow('tokens budget');
  const unknown = new RunBudget({ limits: { costMicros: 1 }, estimate: () => ({}) });
  await expect(unknown.reserve(new Run(), { operation: 'tool' })).rejects.toThrow('unknown');
});

test('Agent enforces budgets before dispatch and persists overrun evidence', async () => {
  const store = new InMemoryRunStore();
  const generateText = jest.fn(async () => ({ message: 'done', usage: { total: 4 } }));
  const agent = new Agent({ generateText }, { runStore: store, retryManager,
    budget: { limits: { tokens: 3 }, estimate: async ({ operation }) => ({ tokens: operation === 'model' ? 3 : 0 }) } });
  await expect(agent.run('ask', { runId: 'overrun' })).rejects.toThrow('reserved bound');
  expect((await store.getRun('overrun')).state.resourceBudget.breached).toBe(true);
  const denied = new Agent({ generateText }, { retryManager,
    budget: { limits: { tokens: 2 }, estimate: async ({ operation }) => ({ tokens: operation === 'model' ? 3 : 0 }) } });
  await expect(denied.run('ask')).rejects.toThrow('tokens budget');
  expect(generateText).toHaveBeenCalledTimes(1);
});
