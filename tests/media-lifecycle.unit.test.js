const { Agent, InMemoryRunStore, Memory, InMemoryLayerStore, EpisodicMemory } = require('..');

test.each(['analyzeImage', 'generateImage', 'transcribeAudio', 'generateAudio', 'analyzeVideo', 'generateVideo'])(
  '%s preserves results and writes metadata-only inspectable runs', async operation => {
    const result = operation.startsWith('generate') ? Buffer.from('private-output') : 'private-transcript';
    const provider = { [operation]: jest.fn(async () => result) };
    const runStore = new InMemoryRunStore();
    const agent = new Agent(provider, { runStore });
    expect(await agent[operation]('private-input')).toEqual(result);
    const [run] = await runStore.listRuns();
    expect(run.status).toBe('completed');
    expect(run.metadata.executionMode).toBe('media');
    expect(run.state.executionCounts.modelCalls).toBe(1);
    expect(run.steps.some(step => step.type === 'model' && step.status === 'completed')).toBe(true);
    const stored = JSON.stringify(run);
    expect(stored).not.toContain('private-input');
    expect(stored).not.toContain('private-output');
    expect(stored).not.toContain('private-transcript');
  });

test('media authorization and budgets deny before dispatch', async () => {
  const generateAudio = jest.fn(async () => Buffer.from('a'));
  const denied = new Agent({ generateAudio }, { authorizeModelCall: async () => false });
  await expect(denied.generateAudio('secret')).rejects.toThrow('denied');
  const budgeted = new Agent({ generateAudio }, { budget: { limits: { tokens: 1 }, estimate: () => ({ tokens: 2 }) } });
  await expect(budgeted.generateAudio('secret')).rejects.toThrow('budget');
  expect(generateAudio).not.toHaveBeenCalled();
});

test('media timeout is uncertain, sanitized, and never retried or resumed as text', async () => {
  const runStore = new InMemoryRunStore();
  const generateAudio = jest.fn(() => new Promise(() => {}));
  const agent = new Agent({ generateAudio }, { runStore, invocationTimeoutMs: 5 });
  await expect(agent.generateAudio('secret', { runId: 'timeout' })).rejects.toThrow('did not complete');
  const run = await runStore.getRun('timeout');
  expect(run.state.resultStatus).toBe('uncertain');
  expect(run.steps.at(-1).status).toBe('failed');
  expect(generateAudio).toHaveBeenCalledTimes(1);
  await expect(agent.resumeRun(run.id)).rejects.toThrow('owning runtime');
});

test('declared unsupported media capabilities and duplicate IDs prevent calls', async () => {
  const generateAudio = jest.fn(async () => 'audio');
  await expect(new Agent({ generateAudio, getCapabilities: () => ({ audioGeneration: false }) })
    .generateAudio('test')).rejects.toThrow('does not support');
  const agent = new Agent({ generateAudio }, { runStore: new InMemoryRunStore() });
  await agent.runMedia('generateAudio', 'test', { runId: 'unique' });
  await expect(agent.runMedia('generateAudio', 'test', { runId: 'unique' })).rejects.toThrow('already exists');
  expect(generateAudio).toHaveBeenCalledTimes(1);
});

test('media reports incomplete results without inventing completion', async () => {
  const agent = new Agent({ generateVideo: async () => ({ completionStatus: 'incomplete', jobId: 'remote' }) });
  const { run, result } = await agent.runMedia('generateVideo', 'test');
  expect(run.status).toBe('paused');
  expect(run.state.resultStatus).toBe('incomplete');
  expect(result.jobId).toBe('remote');
});

test('clearAll awaits backing-store deletion and clears scoped episodic memory', async () => {
  let finish;
  const store = new InMemoryLayerStore();
  const clear = store.clear.bind(store);
  store.clear = () => new Promise(resolve => { finish = async () => { await clear(); resolve(); }; });
  const episodicMemory = new EpisodicMemory({ store: new InMemoryLayerStore(), tenantId: 't', authorize: async () => true });
  const memory = new Memory({ stores: { working: store }, episodicMemory });
  await memory.setWorkingMemory('secret', 'value');
  await episodicMemory.append({ content: 'episode' });
  let completed = false;
  const clearing = memory.clearAll().then(() => { completed = true; });
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  expect(completed).toBe(false);
  await finish(); await clearing;
  expect(await store.entries()).toEqual([]);
  expect(await episodicMemory.search()).toEqual([]);
});

test('background retention failures surface through flushStorage rather than unhandled rejections', async () => {
  const store = new InMemoryLayerStore();
  store.delete = async () => { throw new Error('private backend error'); };
  const memory = new Memory({ stores: { working: store }, policies: { workingLimit: 1 } });
  await memory.setWorkingMemory('a', 'first');
  await expect(memory.setWorkingMemory('b', 'second')).rejects.toThrow('reconcile');
});

test('expired key eviction completes before a replacement is persisted', async () => {
  const store = new InMemoryLayerStore();
  const memory = new Memory({ stores: { working: store } });
  await memory.setWorkingMemory('key', 'old');
  memory.layers.working.key.expiresAt = Date.now() - 1;
  expect(memory.getWorkingMemory('key')).toBeNull();
  await memory.setWorkingMemory('key', 'new');
  await memory.flushStorage();
  expect((await store.get('key')).value).toBe('new');
});
