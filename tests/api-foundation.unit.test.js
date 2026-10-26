const axios = require('axios');
const { Agent, Tool, ApiLoader, OpenAPILoader, InMemoryRunStore, ArtifactResolver,
  DelegationRuntime, Run, DelegationContract, ApprovalSigner } = require('..');
const { ApiTool } = require('../src/api/ApiTool');
const { ToolValidator } = require('../src/utils/ToolValidator');

afterEach(() => jest.restoreAllMocks());

test('API credentials stay in transport context and cancellation propagates', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200,
    headers: { get: () => 'application/json' }, json: async () => ({ ok: true }) });
  const { tools } = ApiLoader.load({ serviceName: 'test', authToken: 'private-token', apiSpec: {
    baseUrl: 'https://example.com', endpoints: { read: { path: '/items/{id}', method: 'GET', pathParams: { id: { type: 'string' } } } },
  } });
  await tools[0].call({ id: 'a/b' }, { signal: new AbortController().signal });
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe('https://example.com/items/a%2Fb');
  expect(url).not.toContain('private-token');
  expect(options.headers.Authorization).toBe('Bearer private-token');
  expect(options.signal).toBeInstanceOf(AbortSignal);
  expect(options.redirect).toBe('manual');
});

test('OpenAPI ignores undeclared arguments, constrains transport and validates response wrapper', async () => {
  const request = jest.spyOn(axios, 'request').mockResolvedValue({ status: 200, data: { ok: true } });
  const implementation = OpenAPILoader.buildImplementation({ baseUrl: 'https://example.com', route: '/items', method: 'get', authToken: 'private' });
  await implementation({ token: 'private', q: 'hello', __parameterLocations: { q: 'query' } });
  expect(request.mock.calls[0][0]).toMatchObject({ url: 'https://example.com/items?q=hello', maxRedirects: 0, timeout: 30000 });
  const schema = OpenAPILoader.extractResponseSchema({ responses: { 200: { content: { 'application/json': { schema: {
    type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'],
  } } } } } });
  const validator = new ToolValidator();
  const outputTool = new Tool({ name: 'response', parameters: schema, implementation: async () => {} });
  expect(validator.validate(outputTool, { status: 200, data: { ok: true } }).valid).toBe(true);
  expect(validator.validate(outputTool, { status: 200, data: {} }).valid).toBe(false);
});

test('API schemas preserve nested required fields, arrays and constraints', () => {
  expect(ApiTool.normalizeName('weather', 'get_/forecast/{city}')).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
  expect(() => ApiTool.normalizeName('x'.repeat(65), 'get')).toThrow('64');
  const schema = ApiTool.mapPropsToJsonSchema({ payload: { type: 'object', required: true, properties: {
    code: { type: 'string', required: true, enum: ['a'], minLength: 1 },
    rows: { type: 'array', items: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } } },
  } } });
  expect(schema.required).toEqual(['payload']);
  expect(schema.properties.payload.required).toEqual(['code']);
  expect(schema.properties.payload.properties.code.enum).toEqual(['a']);
  expect(schema.properties.payload.properties.rows.items.required).toEqual(['id']);
});

test('direct tools run without a text model and final schema failures are persisted', async () => {
  const runStore = new InMemoryRunStore();
  const tool = new Tool({ name: 'read', implementation: async () => ({ ok: true }), metadata: { sideEffectLevel: 'none' } });
  const agent = new Agent(null, { tools: [tool], runStore });
  const run = await agent.runTool('read');
  expect(run.status).toBe('completed');
  expect(run.output).toEqual({ ok: true });
  await expect(new Agent(null, { tools: [tool], runStore, outputSchema: { type: 'string' } })
    .runTool('read', {}, { runId: 'invalid-output' })).rejects.toThrow('schema validation');
  expect((await runStore.getRun('invalid-output')).status).toBe('failed');
});

test('artifact version pin is required and passed to storage', async () => {
  const read = jest.fn(async function* (_id, context) { expect(context.version).toBe('v1'); yield Buffer.from('a'); });
  const store = { stat: async () => ({ tenantId: 't', sizeBytes: 1, version: 'v1' }), read };
  const resolver = new ArtifactResolver({ store, tenantId: 't', authorize: async () => true, requireVersion: true });
  expect((await resolver.read('id')).data.toString()).toBe('a');
  store.stat = async () => ({ tenantId: 't', sizeBytes: 1 });
  await expect(resolver.read('id')).rejects.toThrow('version');
  expect(read).toHaveBeenCalledTimes(1);
});

test('signed direct-tool approvals resume without a text provider and cannot be consumed twice', async () => {
  const action = jest.fn(async () => ({ ok: true }));
  const agent = new Agent(null, { runStore: new InMemoryRunStore(),
    tools: [new Tool({ name: 'write', implementation: action })],
    toolPolicy: { defaultAction: 'require_approval' },
    approvalSigner: new ApprovalSigner({ key: 'x'.repeat(32) }), authorizeResume: async () => true });
  const run = await agent.runTool('write');
  expect(run.status).toBe('waiting_for_approval');
  expect(action).not.toHaveBeenCalled();
  expect((await agent.resumeRun(run.id, { approved: true })).status).toBe('completed');
  expect((await agent.resumeRun(run.id, { approved: true })).status).toBe('completed');
  expect(action).toHaveBeenCalledTimes(1);
});

test('delegation enforces depth/count bounds and rejects asynchronous sync validators', async () => {
  const runtime = new DelegationRuntime({ maxDelegations: 1, maxDepth: 1 });
  const parentRun = new Run({ input: 'parent' });
  const agent = { run: jest.fn(async (_prompt, config) => new Run({ metadata: config.metadata })) };
  await runtime.delegate({ parentRun, agent, prompt: 'child' });
  await expect(runtime.delegate({ parentRun, agent, prompt: 'again' })).rejects.toThrow('budget');
  const child = await agent.run.mock.results[0].value;
  await expect(runtime.delegate({ parentRun: child, agent, prompt: 'nested' })).rejects.toThrow('budget');
  const contract = new DelegationContract({ id: 'sync', inputValidator: async () => false });
  expect(() => contract.validateInput({})).toThrow('synchronous');
});
