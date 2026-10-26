const { ContextWindow, Agent, InMemoryRunStore, RetryManager, Tool, ScopedRetriever,
  ScopedLayerStore, ScopedRunStore, InMemoryLayerStore, RAG, Run, Memory } = require('..');

const countTokens = ({ messages }) => messages.reduce((sum, m) => sum + m.content.length, 0);
const noRetry = new RetryManager({ retries: 0 });

test('context projection preserves pinned instructions, current turn, tool pairs, and raw history', async () => {
  const messages = [{ role: 'system', content: 'policy' },
    { role: 'user', content: 'old request'.repeat(20) },
    { role: 'assistant', content: '', function_call: { name: 'lookup' } },
    { role: 'function', content: 'old tool result' },
    { role: 'user', content: 'current' }];
  const original = JSON.stringify(messages);
  const window = new ContextWindow({ maxTokens: 45, reserveOutputTokens: 10, countTokens,
    pinnedMessages: [{ role: 'system', content: 'never refund twice' }] });
  const result = await window.project(messages);
  expect(result.omittedIndices).toEqual([1, 2, 3]);
  expect(result.sourceIndices).toEqual([0, 4]);
  expect(result.messages.map(m => m.content)).toEqual(['never refund twice', 'policy', 'current']);
  expect(JSON.stringify(messages)).toBe(original);
  expect(result.countingMode).toBe('custom');
});

test('mandatory context overflow fails instead of silently dropping constraints', async () => {
  const window = new ContextWindow({ maxTokens: 10, reserveOutputTokens: 1, countTokens });
  await expect(window.project([{ role: 'system', content: 'too much policy' },
    { role: 'user', content: 'ask' }])).rejects.toThrow('Required context');
  const invalid = new ContextWindow({ maxTokens: 10, reserveOutputTokens: 1, countTokens: () => NaN });
  await expect(invalid.project([])).rejects.toThrow('Invalid token count');
});

test('repeated projection retains full source history and pinned constraints', async () => {
  const window = new ContextWindow({ maxTokens: 50, reserveOutputTokens: 5, countTokens });
  const history = [{ role: 'system', content: 'do not disclose secrets' }];
  for (let i = 0; i < 20; i++) {
    history.push({ role: 'user', content: `question-${i}` }, { role: 'assistant', content: 'response' });
    const result = await window.project(history);
    expect(result.messages[0].content).toBe('do not disclose secrets');
    expect(result.messages.at(-1)).toEqual(history.at(-1));
    expect(result.inputTokens).toBeLessThanOrEqual(45);
  }
  expect(history).toHaveLength(41);
});

test('summaries link to omitted source messages and never replace system constraints', async () => {
  const summarize = jest.fn(async ({ messages }) => messages[0].content.includes('order 42') ? 'order 42' : 'missing');
  const window = new ContextWindow({ maxTokens: 120, reserveOutputTokens: 10, countTokens, summarize });
  const messages = [{ role: 'system', content: 'no refunds without approval' },
    { role: 'user', content: `order 42 ${'old '.repeat(100)}` },
    { role: 'assistant', content: 'noted' }, { role: 'user', content: 'continue' }];
  const result = await window.project(messages);
  expect(result.summary).toEqual({ text: 'order 42', sourceIndices: [1, 2] });
  expect(result.messages[0].content).toBe('no refunds without approval');
  expect(result.messages[1].content).toContain('order 42');
  expect(messages[1].content.length).toBeGreaterThan(300);
});

test('conversation archive survives view compaction and supports explicit deletion', async () => {
  const store = new InMemoryLayerStore();
  const memory = new Memory({ conversationStore: store, policies: { conversationLimit: 1 } });
  await memory.storeConversation('first fact', 'noted');
  await memory.storeConversation('second fact', 'noted');
  expect(memory.getConversation()).toHaveLength(1);
  expect(await memory.getConversationHistory()).toHaveLength(2);
  const restored = await new Memory({ conversationStore: store, policies: { conversationLimit: 1 } }).hydrate();
  expect(restored.getConversation()).toHaveLength(1);
  expect((await restored.getConversationHistory())[0].user).toBe('first fact');
  await restored.deleteConversationHistoryBefore(Date.now() + 1);
  expect(await restored.getConversationHistory()).toHaveLength(0);
});

test('Agent surfaces conversation persistence failures', async () => {
  const store = new InMemoryLayerStore();
  store.set = async () => { throw Error('conversation persistence failed'); };
  const agent = new Agent({ generateText: async () => ({ message: 'done' }) }, {
    memory: new Memory({ conversationStore: store }), retryManager: noRetry,
  });
  await expect(agent.run('ask')).rejects.toThrow('conversation persistence failed');
});

test('Agent bounds actual model dispatches and checks model authorization', async () => {
  const implementation = jest.fn(async () => 'ok');
  const tool = new Tool({ name: 'repeat', implementation });
  const adapter = { generateText: jest.fn(async () => ({ toolCalls: [{ name: 'repeat', arguments: {} }] })) };
  const agent = new Agent(adapter, { tools: [tool], retryManager: noRetry, executionLimits: { modelCalls: 2 } });
  await expect(agent.run('repeat')).rejects.toThrow('modelCalls limit');
  expect(adapter.generateText).toHaveBeenCalledTimes(2);
  const denied = new Agent(adapter, { authorizeModelCall: async () => undefined, retryManager: noRetry });
  await expect(denied.run('private')).rejects.toThrow('Model call denied');
  expect(adapter.generateText).toHaveBeenCalledTimes(2);
});

test('Agent applies projection without altering persisted messages and limits output tokens', async () => {
  const adapter = { generateText: jest.fn(async () => ({ message: 'done' })) };
  const store = new InMemoryRunStore();
  const agent = new Agent(adapter, { runStore: store, retryManager: noRetry,
    contextWindow: { maxTokens: 500, reserveOutputTokens: 20, countTokens } });
  const run = await agent.run('question', { maxTokens: 200 });
  expect(adapter.generateText.mock.calls[0][1].maxTokens).toBe(20);
  expect(run.state.contextWindow.countingMode).toBe('custom');
  expect((await store.getRun(run.id)).messages).toEqual(run.messages);
});

test('caller cancellation prevents model calls and records cancellation', async () => {
  const controller = new AbortController();
  controller.abort();
  const adapter = { generateText: jest.fn() };
  const store = new InMemoryRunStore();
  const agent = new Agent(adapter, { runStore: store, retryManager: noRetry });
  await expect(agent.run('stop', { runId: 'cancelled-run', signal: controller.signal })).rejects.toThrow('cancelled');
  expect(adapter.generateText).not.toHaveBeenCalled();
  expect((await store.getRun('cancelled-run')).status).toBe('cancelled');
});

test('Agent final output schemas reject invalid JSON and return validated structured results', async () => {
  const store = new InMemoryRunStore();
  const adapter = { generateText: jest.fn(async () => ({ message: '{"ready":true}' })) };
  const agent = new Agent(adapter, { runStore: store, retryManager: noRetry,
    outputSchema: { type: 'object', properties: { ready: { type: 'boolean' } }, required: ['ready'] } });
  expect((await agent.run('extract')).output).toEqual({ ready: true });
  adapter.generateText.mockResolvedValue({ message: 'invalid' });
  await expect(agent.run('extract', { runId: 'invalid-output' })).rejects.toThrow('schema validation');
  expect((await store.getRun('invalid-output')).output).toBeNull();
});

test('scoped retrieval overrides namespace and rejects out-of-scope documents', async () => {
  const retriever = { search: jest.fn(async () => ({ matches: [
    { id: 'doc', text: 'allowed', metadata: { tenantId: 'tenant-a' } },
  ], debug: { text: 'private-other-document' } })) };
  const scoped = new ScopedRetriever({ retriever, tenantId: 'tenant-a', authorizeQuery: async () => true });
  const rag = new RAG({ adapter: {}, retriever: scoped, retryManager: noRetry });
  const result = await rag.searchWithProvenance('query', { namespace: 'tenant-b' });
  expect(retriever.search.mock.calls[0][1].namespace).toBe('tenant-a');
  expect(result.debug).toBeUndefined();
  retriever.search.mockResolvedValue({ matches: [{ text: 'private', metadata: { tenantId: 'tenant-b' } }] });
  await expect(scoped.search('query')).rejects.toThrow('scope violation');
  const denied = new ScopedRetriever({ retriever, tenantId: 'tenant-a', authorizeQuery: async () => false });
  retriever.search.mockClear();
  await expect(denied.search('query')).rejects.toThrow('denied');
  expect(retriever.search).not.toHaveBeenCalled();
});

test('memory scoping isolates get/list/delete/clear across tenants', async () => {
  const store = new InMemoryLayerStore();
  const a = new ScopedLayerStore({ store, tenantId: 'a' });
  const b = new ScopedLayerStore({ store, tenantId: 'a:other' });
  await a.set('same', { value: 'a' });
  await b.set('same', { value: 'b' });
  expect((await a.get('same')).value).toBe('a');
  expect(await b.entries()).toEqual([['same', { value: 'b' }]]);
  await a.clear();
  expect(await a.get('same')).toBeNull();
  expect((await b.get('same')).value).toBe('b');
});

test('run namespaces prevent same-ID collisions and cross-tenant reads/lists', async () => {
  const store = new InMemoryRunStore();
  const a = new ScopedRunStore({ store, tenantId: 'a' });
  const b = new ScopedRunStore({ store, tenantId: 'b' });
  await a.saveRun(new Run({ id: 'same', input: 'private-a' }));
  expect(await b.getRun('same')).toBeNull();
  await b.saveRun(new Run({ id: 'same', input: 'private-b' }));
  expect((await a.getRun('same')).input).toBe('private-a');
  expect((await b.getRun('same')).input).toBe('private-b');
  expect((await a.listRuns()).map(run => run.input)).toEqual(['private-a']);
  expect((await b.listRuns())[0].id).toBe('same');
});
