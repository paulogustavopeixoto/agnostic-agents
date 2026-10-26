const { Agent, InMemoryRunStore, RetryManager, Tool, ProducerJobRunner, GuardedProvider } = require('..');

function agentWithPolicy(toolPolicy, extra = {}) {
  const implementation = jest.fn(async () => 'done');
  const agent = new Agent({ generateText: jest.fn()
    .mockResolvedValueOnce({ toolCalls: [{ name: 'write', arguments: { value: 'approved value' } }] })
    .mockResolvedValue({ message: 'done' }) }, {
    tools: [new Tool({ name: 'write', implementation })], toolPolicy,
    retryManager: new RetryManager({ retries: 0 }), runStore: new InMemoryRunStore(), ...extra,
  });
  return { agent, implementation };
}

test.each([async () => ({ action: 'deny' }), async () => undefined, () => ({ action: 'typo' })])(
  'async denials and malformed tool decisions fail closed', async evaluate => {
    const { agent, implementation } = agentWithPolicy({ evaluate });
    await expect(agent.run('write')).rejects.toThrow();
    expect(implementation).not.toHaveBeenCalled();
  });

test('custom evaluators cannot override explicit denylists', async () => {
  const { agent, implementation } = agentWithPolicy({ denyTools: ['write'], evaluate: () => ({ action: 'allow' }) });
  await expect(agent.run('write')).rejects.toThrow();
  expect(implementation).not.toHaveBeenCalled();
});

test('declared risky tools are not retried unless explicitly idempotent and retryable', async () => {
  const { agent, implementation } = agentWithPolicy({ verify: async () => ({ action: 'allow' }) });
  agent.retryManager = new RetryManager({ retries: 2, baseDelay: 1, maxDelay: 1 });
  agent.tools[0].metadata.sideEffectLevel = 'external_write';
  implementation.mockRejectedValue(new Error('remote outcome uncertain'));
  await expect(agent.run('write')).rejects.toThrow('remote outcome uncertain');
  expect(implementation).toHaveBeenCalledTimes(1);
});

test('approval resume requires host authorization even with approved true', async () => {
  const { agent, implementation } = agentWithPolicy({ defaultAction: 'require_approval' }, { authorizeResume: async () => false });
  const run = await agent.run('write');
  await expect(agent.resumeRun(run.id, { approved: true })).rejects.toThrow('authorization denied');
  expect(implementation).not.toHaveBeenCalled();
  expect((await agent.runStore.getRun(run.id)).status).toBe('waiting_for_approval');
});

test('expired approvals cannot execute', async () => {
  const { agent, implementation } = agentWithPolicy({ defaultAction: 'require_approval' });
  const run = await agent.run('write');
  run.pendingApproval.expiresAt = '2000-01-01T00:00:00Z';
  await agent.runStore.saveRun(run);
  await expect(agent.resumeRun(run.id, { approved: true })).rejects.toThrow('expired');
  expect(implementation).not.toHaveBeenCalled();
});

test('remote jobs resume by persisted ID without restarting generation', async () => {
  const store = new InMemoryRunStore();
  const backend = { start: jest.fn(async () => ({ jobId: 'remote-1' })), poll: jest.fn()
    .mockResolvedValueOnce({ status: 'pending' })
    .mockResolvedValueOnce({ status: 'completed', content: [{ type: 'video', artifactId: 'asset', mimeType: 'video/mp4' }] }) };
  const options = { backend, runStore: store, authorize: async () => true, maxPolls: 1, pollIntervalMs: 0 };
  const started = await new ProducerJobRunner(options).start({ operation: 'video', content: [] });
  expect((await new ProducerJobRunner(options).resume(started.id)).status).toBe('paused');
  expect((await new ProducerJobRunner(options).resume(started.id)).status).toBe('completed');
  expect(backend.start).toHaveBeenCalledTimes(1);
  expect(backend.poll).toHaveBeenCalledTimes(2);
});

test('uncertain starts require reconciliation and are not automatically repeated', async () => {
  const backend = { start: jest.fn(async () => { throw Error('connection lost'); }), poll: jest.fn() };
  const runner = new ProducerJobRunner({ backend, runStore: new InMemoryRunStore(), authorize: async () => true });
  const run = await runner.start({ operation: 'video', content: [] });
  expect(run.state.remoteJob.status).toBe('uncertain');
  await expect(runner.resume(run.id)).rejects.toThrow('reconciliation');
  expect(backend.start).toHaveBeenCalledTimes(1);
  expect(backend.poll).not.toHaveBeenCalled();
});

test('provider guards deny embeddings and generation before provider invocation', async () => {
  const provider = { getCapabilities: () => ({ generateText: true, embeddings: true }),
    generateText: jest.fn(), embedChunks: jest.fn() };
  const guard = new GuardedProvider({ id: 'private-provider', provider, authorize: async () => false });
  await expect(guard.generateText('private')).rejects.toThrow('denied');
  await expect(guard.embedChunks(['private'])).rejects.toThrow('denied');
  expect(provider.generateText).not.toHaveBeenCalled();
  expect(provider.embedChunks).not.toHaveBeenCalled();
  const allowed = new GuardedProvider({ id: 'private-provider', provider, authorize: async request => request.operation === 'generateText' });
  await allowed.generateText('allowed');
  expect(provider.generateText).toHaveBeenCalledTimes(1);
  await expect(allowed.generateVideo('unsupported')).rejects.toThrow('does not support');
});
