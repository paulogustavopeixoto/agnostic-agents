const { SchemaSafety, Tool, Agent, RetryManager, MCPClient, ScopedRetriever,
  LocalVectorStore, ScopedVectorStore, EpisodicMemory, InMemoryLayerStore, ProducerRuntime, FunctionProducer } = require('..');
const { ToolValidator } = require('../src/utils/ToolValidator');

test('schema safety rejects complexity, cycles, unreviewed patterns and references', () => {
  const guard = new SchemaSafety();
  expect(() => guard.assertSchema({ type: 'string', pattern: '(a+)+$' })).toThrow('opt-in');
  expect(() => guard.assertSchema({ $ref: '#' })).toThrow('review');
  expect(() => guard.assertSchema({ $ref: 'https://example.com/schema' })).toThrow('External');
  const cycle = {}; cycle.child = cycle;
  expect(() => guard.assertValue(cycle)).toThrow('cyclic');
  expect(() => new SchemaSafety({ maxBytes: 10 }).assertValue('x'.repeat(100))).toThrow('size');
  expect(() => guard.assertSchema({ type: 'object', properties: { pattern: { type: 'string' } } })).not.toThrow();
});

test('schema changes invalidate cached tool validation', () => {
  const validator = new ToolValidator();
  const tool = new Tool({ name: 'test', parameters: { type: 'object', required: ['a'] }, implementation: async () => {} });
  expect(validator.validate(tool, { a: 1 }).valid).toBe(true);
  tool.parameters.required = ['b'];
  expect(validator.validate(tool, { a: 1 }).valid).toBe(false);
});

test('MCP uses standard request names, paginates, returns structured content, and does not retry calls', async () => {
  const transport = jest.fn(async ({ method, params }) => {
    if (method === 'tools/list') return { tools: [{ name: params.cursor ? 'second' : 'first', inputSchema: { type: 'object' } }],
      ...(params.cursor ? {} : { nextCursor: 'page-2' }) };
    return { content: [], structuredContent: { ok: true } };
  });
  const client = new MCPClient({ transport });
  expect(await client.listTools()).toHaveLength(2);
  expect(await client.execute('first', {})).toEqual({ ok: true });
  expect(transport.mock.calls.at(-1)[0].params).toEqual({ name: 'first', arguments: {} });
  transport.mockClear(); transport.mockRejectedValue(Error('lost result'));
  await expect(client.execute('write', {})).rejects.toThrow('lost result');
  expect(transport).toHaveBeenCalledTimes(1);
});

test('document-level denials cannot reach a model', async () => {
  const scoped = new ScopedRetriever({ tenantId: 'a', authorizeQuery: async () => true,
    authorizeMatch: async () => false, retriever: { search: async () => ({ matches: [
      { text: 'restricted', metadata: { tenantId: 'a' } },
    ] }) } });
  await expect(scoped.search('private')).rejects.toThrow('document access denied');
});

test('local vector namespaces isolate same IDs and scoped deletion cannot erase another tenant', async () => {
  const store = new LocalVectorStore();
  const a = new ScopedVectorStore({ store, tenantId: 'a', authorize: async () => true });
  const b = new ScopedVectorStore({ store, tenantId: 'b', authorize: async () => true });
  await a.upsert({ vectors: [{ id: 'same', values: [1, 0], metadata: { text: 'a' } }] });
  await b.upsert({ vectors: [{ id: 'same', values: [1, 0], metadata: { text: 'b' } }] });
  expect((await a.query({ vector: [1, 0], namespace: 'b' })).matches[0].metadata.text).toBe('a');
  await a.deleteAll({ namespace: 'b' });
  expect((await a.query({ vector: [1, 0] })).matches).toHaveLength(0);
  expect((await b.query({ vector: [1, 0] })).matches).toHaveLength(1);
});

test('episodic memory scopes records, supports provenance and deletion', async () => {
  const store = new InMemoryLayerStore();
  const a = new EpisodicMemory({ store, tenantId: 'a', authorize: async () => true });
  const b = new EpisodicMemory({ store, tenantId: 'b', authorize: async () => true });
  const episode = await a.append({ content: 'refund approved', runId: 'run-1', tags: ['support'] });
  expect((await a.search({ query: 'refund' }))[0].runId).toBe('run-1');
  expect(await b.search()).toEqual([]);
  await a.forget(episode.id);
  expect(await a.search()).toEqual([]);
});

test('deadlines release callers without pretending remote work was cancelled', async () => {
  const runtime = new ProducerRuntime({ producer: new FunctionProducer({ id: 'slow', operations: {
    generate: () => new Promise(() => {}),
  } }), invocationTimeoutMs: 10 });
  const run = await runtime.run({ operation: 'generate', content: [] });
  expect(run.state.resultStatus).toBe('uncertain');
  const tool = new Tool({ name: 'bad_output', outputSchema: { type: 'object' }, implementation: async () => 'wrong' });
  const agent = new Agent({ generateText: async () => ({ toolCalls: [{ name: tool.name, arguments: {} }] }) },
    { tools: [tool], retryManager: new RetryManager({ retries: 0 }) });
  await expect(agent.run('ask')).rejects.toThrow('output schema');
});
