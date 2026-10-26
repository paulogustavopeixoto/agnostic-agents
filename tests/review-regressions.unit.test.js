const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { Agent, Tool, MCPDiscoveryLoader, FallbackRouter, RetryManager, InMemoryRunStore,
  WorkflowRunner, Workflow, BackgroundJobScheduler, InMemoryJobStore, RealtimeSession,
  RAG, LocalVectorStore, FileVectorStore } = require('..');
const { AnthropicAdapter } = require('../src/llm/anthropic');
const { GeminiAdapter } = require('../src/llm/gemini');
const { OpenAIAdapter } = require('../src/llm/openAi');
const { HFAdapter } = require('../src/llm/huggingFace');
const immediate = () => new Promise(resolve => setImmediate(resolve));
const noRetry = () => new RetryManager({ retries: 0 });

test('R01 verifier egress obeys model authorization before sending private context', async () => {
  const authorizeModelCall = jest.fn(async () => false);
  const generateText = jest.fn(async () => ({ message: '{"action":"allow"}' }));
  const implementation = jest.fn(async () => 'done');
  const tool = new Tool({ name: 'write', implementation,
    metadata: { sideEffectLevel: 'external_write', retryabilityHint: 'never' } });
  const agent = new Agent(null, { tools: [tool], authorizeModelCall, verifier: { generateText } });
  await expect(agent.runTool('write', { secret: 'synthetic' })).rejects.toThrow();
  expect(authorizeModelCall).toHaveBeenCalled();
  expect(generateText).not.toHaveBeenCalled();
  expect(implementation).not.toHaveBeenCalled();
});

test('R02 untrusted video URLs and paths never trigger imports or uploads', async () => {
  const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('unexpected network'));
  try {
    const adapter = new HFAdapter('synthetic', { retryManager: noRetry() });
    for (const input of ['http://169.254.169.254/test.mp4', '/tmp/private.mp4', 'file:///tmp/private.mp4']) {
      await expect(adapter.analyzeVideo(input)).rejects.toThrow();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally { fetchSpy.mockRestore(); }
});

test('R03 discovered destructive tools require approval by default', async () => {
  const execute = jest.fn(async () => ({ ok: true }));
  const { tools } = await MCPDiscoveryLoader.load({ mcpClient: {
    listTools: async () => [{ name: 'delete_records', annotations: { destructiveHint: true },
      inputSchema: { type: 'object', properties: {} } }], execute,
  } });
  const run = await new Agent(null, { tools }).runTool(tools[0].name);
  expect(run.status).toBe('waiting_for_approval');
  expect(execute).not.toHaveBeenCalled();
});

test.each([{ retryable: false }, { uncertain: true }, { name: 'AbortError' }])(
  'R04 terminal outcomes never fall back (%j)', async flags => {
    const failure = Object.assign(new Error('terminal'), flags);
    const second = jest.fn(async () => 'duplicate');
    const provider = generateText => ({ generateText, getCapabilities: () => ({ generateText: true }) });
    const router = new FallbackRouter({ providers: [provider(async () => { throw failure; }), provider(second)] });
    await expect(router.generateText([])).rejects.toBe(failure);
    expect(second).not.toHaveBeenCalled();
  });

test('R05 governed calls disable adapter retry multiplication and propagate signals', async () => {
  const adapter = new AnthropicAdapter('synthetic', {
    retryManager: new RetryManager({ retries: 2, baseDelay: 0, maxDelay: 0 }),
  });
  const create = jest.fn(async () => { throw new Error('synthetic'); });
  adapter.client.messages.create = create;
  const store = new InMemoryRunStore();
  await expect(new Agent(adapter, { runStore: store, retryManager: noRetry(), executionLimits: { modelCalls: 1 } })
    .run('hello')).rejects.toThrow();
  expect(create).toHaveBeenCalledTimes(1);
  expect(create.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  expect(adapter.client.maxRetries).toBe(0);
});

test('R06 Gemini uses installed SDK helper methods and provider-native system placement', async () => {
  const adapter = new GeminiAdapter('synthetic');
  const generateContent = jest.fn(async () => ({ response: { text: () => 'ok', functionCalls: () => undefined } }));
  adapter.genAI.getGenerativeModel = jest.fn(() => ({ generateContent }));
  const result = await adapter.generateText([{ role: 'system', content: 'policy' }, { role: 'user', content: 'hi' }]);
  expect(result.message).toBe('ok');
  expect(result.toolCalls).toEqual([]);
  expect(generateContent.mock.calls[0][0].contents.map(m => m.role)).toEqual(['user']);
  expect(adapter.genAI.getGenerativeModel.mock.calls[0][0].systemInstruction).toBe('policy');
});

test('R07 Anthropic translates system and legacy tool history with matching IDs', async () => {
  const adapter = new AnthropicAdapter('synthetic');
  const create = jest.fn(async () => ({ content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn' }));
  adapter.client.messages.create = create;
  await adapter.generateText([{ role: 'system', content: 'policy' }, { role: 'user', content: 'hi' },
    { role: 'assistant', content: '', function_call: { name: 'read', arguments: '{}' } },
    { role: 'function', name: 'read', content: '{"ok":true}' }]);
  const request = create.mock.calls[0][0];
  expect(request.system).toBe('policy');
  expect(request.messages.map(m => m.role)).toEqual(['user', 'assistant', 'user']);
  const call = request.messages[1].content[0], result = request.messages[2].content[0];
  expect(call.type).toBe('tool_use'); expect(result.type).toBe('tool_result');
  expect(result.tool_use_id).toBe(call.id);
});

test('R08 truncated model output pauses instead of completing', async () => {
  const adapter = new OpenAIAdapter('synthetic');
  adapter.openai.chat.completions.create = jest.fn(async () => ({
    choices: [{ message: { content: 'partial' }, finish_reason: 'length' }],
  }));
  const run = await new Agent(adapter, { retryManager: noRetry() }).run('hi');
  expect(run.status).toBe('paused'); expect(run.state.resultStatus).toBe('incomplete');
});

test('R09 workflow continuation excludes a live owner and refuses run-ID overwrite', async () => {
  let release, entered;
  const barrier = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { entered = resolve; });
  const action = jest.fn(async () => { entered(); await barrier; return 'ok'; });
  const runner = new WorkflowRunner({ workflow: new Workflow({ id: 'w', steps: [{ id: 's', run: action }] }) });
  const pending = runner.run('input', { runId: 'review-workflow' });
  await ready;
  try { await expect(runner.resumeRun('review-workflow')).rejects.toThrow(); }
  finally { release(); await pending; }
  expect(action).toHaveBeenCalledTimes(1);
  await expect(runner.run('new', { runId: 'review-workflow' })).rejects.toThrow();
});

test('R10 concurrent scheduler ticks claim each due job once', async () => {
  const store = new InMemoryJobStore(); let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const action = jest.fn(async () => { await barrier; return 'ok'; });
  const a = new BackgroundJobScheduler({ store, handlers: { h: action } });
  const b = new BackgroundJobScheduler({ store, handlers: { h: action } });
  await a.schedule({ id: 'review-job', handler: 'h' });
  const first = a.runDueJobs(), second = b.runDueJobs();
  await immediate(); release();
  await Promise.all([first, second]); expect(action).toHaveBeenCalledTimes(1);
});

test('R11 interrupt during receive authorization discards stale frames', async () => {
  let entered, release;
  const ready = new Promise(resolve => { entered = resolve; });
  const barrier = new Promise(resolve => { release = resolve; });
  const session = new RealtimeSession({ transport: { connect: async () => {}, send: async () => {},
    interrupt: async () => {}, close: async () => {}, events: async function* () {
      yield { type: 'text', text: 'old', epoch: 0 }; yield { type: 'end', epoch: 1 };
    } }, authorize: async ({ operation }) => { if (operation === 'receive') { entered(); await barrier; } return true; } });
  await session.open(); const iterator = session.events(); const next = iterator.next();
  await ready; await session.interrupt(); release();
  expect((await next).done).toBe(true);
});

test('R12 same-millisecond indexing preserves both documents', async () => {
  const clock = jest.spyOn(Date, 'now').mockReturnValue(12345);
  try {
    const store = new LocalVectorStore();
    const rag = new RAG({ adapter: { embedChunks: async chunks => chunks.map(() => ({ embedding: [1] })) }, vectorStore: store });
    const a = await rag.index('document A'), b = await rag.index('document B');
    expect(a[0]).not.toBe(b[0]); expect((await store.query({ vector: [1] })).matches).toHaveLength(2);
  } finally { clock.mockRestore(); }
});

test('R13/R14 malformed and mutated vector input cannot poison committed storage', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'review-vectors-'));
  try {
    const store = new FileVectorStore({ filePath: path.join(directory, 'vectors.json') });
    await store.upsert({ vectors: [{ id: 'good', values: [1] }] });
    await expect(store.upsert({ vectors: [{ id: 'hole', values: new Array(2) }] })).rejects.toThrow();
    const values = [1];
    const pending = store.upsert({ vectors: [{ id: 'mutated', values }] });
    values.push(...new Array(65536).fill(1)); await pending;
    expect((await store.query({ vector: [1] })).matches).toHaveLength(2);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('R01 JSON-repair calls are re-authorized and cannot leak through a denied second call', async () => {
  const generateText = jest.fn(async () => ({ message: 'invalid JSON' }));
  const authorizeModelCall = jest.fn().mockResolvedValueOnce(true).mockResolvedValue(false);
  const implementation = jest.fn(async () => 'done');
  const tool = new Tool({ name: 'review-write', implementation, metadata: { sideEffectLevel: 'external_write' } });
  await expect(new Agent(null, { tools: [tool], verifier: { generateText }, authorizeModelCall })
    .runTool(tool.name)).rejects.toThrow();
  expect(generateText).toHaveBeenCalledTimes(1);
  expect(authorizeModelCall).toHaveBeenCalledTimes(2);
  expect(implementation).not.toHaveBeenCalled();
});

test('R01 verifier dispatch has a deadline and counts toward the model ceiling', async () => {
  const tool = new Tool({ name: 'bounded-write', implementation: async () => 'done', metadata: { sideEffectLevel: 'external_write' } });
  let signal;
  const verifier = { generateText: jest.fn((_, options) => { signal = options.signal; return new Promise(() => {}); }) };
  const runStore = new InMemoryRunStore();
  await expect(new Agent(null, { tools: [tool], verifier, runStore, invocationTimeoutMs: 10 })
    .runTool(tool.name)).rejects.toThrow();
  expect(signal.aborted).toBe(true);
  expect((await runStore.listRuns())[0].state.executionCounts.modelCalls).toBe(1);
});

test('R04/R05 governed fallback cannot hide multiple provider attempts behind one reservation', async () => {
  const second = jest.fn(async () => ({ message: 'unexpected' }));
  const first = jest.fn(async () => { throw new Error('temporary transport error'); });
  const providers = [first, second].map(generateText => ({ generateText, getCapabilities: () => ({ generateText: true }) }));
  await expect(new Agent(new FallbackRouter({ providers }), { retryManager: noRetry() }).run('hi')).rejects.toThrow();
  expect(first).toHaveBeenCalledTimes(1); expect(second).not.toHaveBeenCalled();
});

test('R10 file-backed job claims exclude separate store instances', async () => {
  const { FileJobStore } = require('..');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'review-jobs-'));
  try {
    const a = new FileJobStore({ directory }), b = new FileJobStore({ directory });
    const job = { id: 'same', status: 'scheduled', runAt: '2026-10-26T00:00:00.000Z' };
    await a.saveJob(job);
    const results = await Promise.all([a.claimJob(job.id, job.runAt), b.claimJob(job.id, job.runAt)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await b.getJob(job.id)).status).toBe('running');
    expect(await b.claimJob(job.id, job.runAt)).toBeNull();
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('R09 file-backed workflow ownership is shared across runner instances', async () => {
  const { FileRunStore } = require('..');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'review-workflow-'));
  let release, entered;
  const barrier = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { entered = resolve; });
  try {
    const workflow = new Workflow({ id: 'w', steps: [{ id: 's', run: async () => { entered(); await barrier; return 'ok'; } }] });
    const a = new WorkflowRunner({ workflow, runStore: new FileRunStore({ directory }) });
    const b = new WorkflowRunner({ workflow, runStore: new FileRunStore({ directory }) });
    const pending = a.run('input', { runId: 'same' }); await ready;
    try { await expect(b.resumeRun('same')).rejects.toThrow('locked'); }
    finally { release(); await pending; }
    expect((await b.resumeRun('same')).status).toBe('completed');
  } finally { release(); await fs.rm(directory, { recursive: true, force: true }); }
});

test('R11 closing during receive authorization never yields a late frame', async () => {
  let entered, release;
  const ready = new Promise(resolve => { entered = resolve; });
  const barrier = new Promise(resolve => { release = resolve; });
  const session = new RealtimeSession({ transport: { connect: async () => {}, send: async () => {},
    interrupt: async () => {}, close: async () => {}, events: async function* () { yield { type: 'text', text: 'old', epoch: 0 }; } },
    authorize: async ({ operation }) => { if (operation === 'receive') { entered(); await barrier; } return true; } });
  await session.open(); const next = session.events().next(); await ready; await session.close(); release();
  expect((await next).done).toBe(true);
});

test.each(['anthropic', 'gemini', 'deepseek'])('R08 %s preserves incomplete completion state', async name => {
  let adapter;
  if (name === 'anthropic') {
    adapter = new AnthropicAdapter('synthetic');
    adapter.client.messages.create = jest.fn(async () => ({ content: [{ type: 'text', text: 'partial' }], stop_reason: 'max_tokens' }));
  } else if (name === 'gemini') {
    adapter = new GeminiAdapter('synthetic');
    adapter.genAI.getGenerativeModel = () => ({ generateContent: async () => ({ response: {
      text: () => 'partial', functionCalls: () => undefined, candidates: [{ finishReason: 'MAX_TOKENS' }],
    } }) });
  } else {
    const { DeepSeekAdapter } = require('../src/llm/deepSeek');
    adapter = new DeepSeekAdapter('synthetic');
    adapter.openai.chat.completions.create = jest.fn(async () => ({ choices: [{ message: { content: 'partial' }, finish_reason: 'length' }] }));
  }
  const run = await new Agent(adapter, { retryManager: noRetry() }).run('hi');
  expect(run.status).toBe('paused'); expect(run.state.resultStatus).toBe('incomplete');
});

test('R05 Hugging Face SDK calls disable its implicit retries and receive cancellation', async () => {
  const adapter = new HFAdapter('synthetic');
  adapter.inference = { textGeneration: jest.fn(async () => ({ generated_text: 'plain text' })) };
  await new Agent(adapter, { retryManager: noRetry() }).run('hi');
  expect(adapter.inference.textGeneration).toHaveBeenCalledTimes(1);
  expect(adapter.inference.textGeneration.mock.calls[0][1]).toEqual({ signal: expect.any(AbortSignal), retry_on_error: false });
});
