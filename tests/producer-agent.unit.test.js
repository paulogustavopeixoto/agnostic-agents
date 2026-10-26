const { Agent, ProducerTool, ProducerRuntime, FunctionProducer, InMemoryRunStore,
  RetryManager, ToolSandboxRunner, Tool, normalizeContent } = require('..');

function setup({ maxCallsPerRun = 1, handler, toolPolicy } = {}) {
  const store = new InMemoryRunStore();
  const produce = jest.fn(handler || (async () => ({ content: [
    { type: 'image', artifactId: 'assets/generated', mimeType: 'image/png' },
  ] })));
  const runtime = new ProducerRuntime({ runStore: store,
    producer: new FunctionProducer({ id: 'test', operations: { generate: produce } }) });
  const tool = new ProducerTool({ name: 'create_image', runtime, operation: 'generate',
    parameters: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] },
    toContent: args => [{ type: 'text', text: args.prompt }], maxCallsPerRun });
  const adapter = { generateText: jest.fn()
    .mockResolvedValueOnce({ toolCalls: [{ name: tool.name, arguments: { prompt: 'lighthouse' } }] })
    .mockResolvedValue({ message: 'Created.' }) };
  const agent = new Agent(adapter, { tools: [tool], runStore: store,
    toolPolicy: { verify: async () => ({ action: 'allow' }), ...toolPolicy },
    retryManager: new RetryManager({ retries: 2, baseDelay: 1, maxDelay: 1 }) });
  return { agent, store, produce, runtime, tool, adapter };
}

test('Agent invokes a producer through a tool and persists correlated media runs', async () => {
  const { agent, store, produce } = setup();
  const parent = await agent.run('Create a lighthouse');
  expect(parent.status).toBe('completed');
  expect(produce).toHaveBeenCalledTimes(1);
  expect(parent.state.producerToolCalls.create_image).toBe(1);
  const child = await store.getRun(parent.toolResults[0].result.runId);
  expect(child.metadata.lineage.parentRunId).toBe(parent.id);
  expect(child.metadata.lineage.rootRunId).toBe(parent.id);
  expect(parent.metadata.lineage.childRunIds).toContain(child.id);
  expect(child.output.content[0].artifactId).toBe('assets/generated');
});

test('denied producer tool never contacts the producer', async () => {
  const { agent, produce } = setup({ toolPolicy: { denyTools: ['create_image'] } });
  await expect(agent.run('Generate')).rejects.toThrow();
  expect(produce).not.toHaveBeenCalled();
});

test('approval-required production pauses before contacting the producer', async () => {
  const { agent, produce } = setup({ toolPolicy: { defaultAction: 'require_approval' } });
  const run = await agent.run('Generate');
  expect(run.status).toBe('waiting_for_approval');
  expect(produce).not.toHaveBeenCalled();
});

test('call limits prevent repeated provider dispatch', async () => {
  const { agent, adapter, produce } = setup();
  adapter.generateText.mockResolvedValue({ toolCalls: [{ name: 'create_image', arguments: { prompt: 'again' } }] });
  await expect(agent.run('Generate')).rejects.toThrow('limit');
  expect(produce).toHaveBeenCalledTimes(1);
});

test('failed generation is not retried even when a larger call limit permits more calls', async () => {
  const { agent, produce } = setup({ maxCallsPerRun: 5, handler: async () => { throw Error('remote uncertain'); } });
  await expect(agent.run('Generate')).rejects.toThrow('did not complete');
  expect(produce).toHaveBeenCalledTimes(1);
});

test('structured results are JSON-only and validated before completion', async () => {
  expect(() => normalizeContent([{ type: 'json', value: { a: Infinity } }])).toThrow();
  expect(() => normalizeContent([{ type: 'json', value: new Date() }])).toThrow();
  const value = { ready: true };
  const part = normalizeContent([{ type: 'json', value }])[0];
  value.ready = false;
  expect(part.value.ready).toBe(true);
  const producer = new FunctionProducer({ id: 'json', operations: { extract: async () => ({ content: [part] }) } });
  const schema = { type: 'object', properties: { content: { type: 'array', items: {
    type: 'object', properties: { value: { type: 'object', required: ['missing'] } },
  } } } };
  const failed = await new ProducerRuntime({ producer, outputSchema: schema }).run({ operation: 'extract', content: [] });
  expect(failed.status).toBe('failed');
  expect(failed.output).toBeNull();
  expect((await new ProducerRuntime({ producer }).run({ operation: 'extract', content: [] })).output.content[0]).toEqual(part);
});

test('simulation without a simulator cannot execute a real tool', async () => {
  const implementation = jest.fn();
  const tool = new Tool({ name: 'dangerous', implementation });
  const sandbox = new ToolSandboxRunner();
  await expect(sandbox.run(tool)).rejects.toThrow('explicit simulator');
  await expect(sandbox.run(tool, {}, { mode: 'execute' })).rejects.toThrow();
  expect((await sandbox.run(tool, {}, { mode: 'dry_run' })).simulated).toBe(true);
  expect(implementation).not.toHaveBeenCalled();
});
