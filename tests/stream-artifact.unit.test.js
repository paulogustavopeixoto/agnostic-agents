const { FunctionProducer, ProducerRuntime, ArtifactResolver } = require('..');

test('producer streams apply pull backpressure and persist final content', async () => {
  let pulls = 0;
  const producer = new FunctionProducer({ id: 'stream', streams: { text: async function* () {
    pulls++; yield { type: 'content', content: [{ type: 'text', text: 'hello' }] };
    pulls++; yield { type: 'content', content: [{ type: 'text', text: 'world' }] };
  } } });
  const runtime = new ProducerRuntime({ producer });
  const stream = runtime.stream({ operation: 'text', content: [] });
  const first = await stream.next();
  expect(pulls).toBe(1);
  expect(first.value.content[0].text).toBe('hello');
  await stream.next();
  expect(pulls).toBe(2);
  const terminal = (await stream.next()).value;
  expect(terminal.type).toBe('completed');
  expect((await runtime.runStore.getRun(terminal.run.id)).output.content).toHaveLength(2);
});

test('consumer interruption closes upstream and persists cancellation', async () => {
  let closed = false;
  const producer = new FunctionProducer({ id: 'stream', streams: { text: async function* () {
    try {
      yield { type: 'content', content: [{ type: 'text', text: 'partial' }] };
      throw Error('must not reach');
    } finally { closed = true; }
  } } });
  const runtime = new ProducerRuntime({ producer });
  let id;
  for await (const event of runtime.stream({ operation: 'text', content: [] })) { id = event.runId; break; }
  expect(closed).toBe(true);
  expect((await runtime.runStore.getRun(id)).status).toBe('cancelled');
  expect((await runtime.runStore.getRun(id)).output).toBeNull();
});

test('stream errors and output limits cannot produce a completed run', async () => {
  const producer = new FunctionProducer({ id: 'stream', streams: { text: async function* () {
    yield { type: 'content', content: [{ type: 'text', text: 'a'.repeat(100) }] };
  } } });
  const runtime = new ProducerRuntime({ producer, maxOutputBytes: 20 });
  const events = [];
  for await (const event of runtime.stream({ operation: 'text', content: [] })) events.push(event);
  expect(events).toHaveLength(1);
  expect(events[0].type).toBe('failed');
});

test('artifact authorization is checked before storage reads and ownership is checked before content reads', async () => {
  const store = { stat: jest.fn(async () => ({ tenantId: 'other', sizeBytes: 1 })), read: jest.fn() };
  const denied = new ArtifactResolver({ store, tenantId: 'a', authorize: async () => false });
  await expect(denied.read('asset')).rejects.toThrow('denied');
  expect(store.stat).not.toHaveBeenCalled();
  const resolver = new ArtifactResolver({ store, tenantId: 'a', authorize: async () => true });
  await expect(resolver.read('asset')).rejects.toThrow('scope');
  expect(store.read).not.toHaveBeenCalled();
});

test('artifact size mismatches close the stream and return no content', async () => {
  let closed = false;
  const store = { stat: async () => ({ tenantId: 'a', sizeBytes: 1 }), read: async function* () {
    try { yield Buffer.from('too large'); } finally { closed = true; }
  } };
  const resolver = new ArtifactResolver({ store, tenantId: 'a', authorize: async () => true });
  await expect(resolver.read('asset')).rejects.toThrow('size');
  expect(closed).toBe(true);
  store.stat = async () => ({ tenantId: 'a', sizeBytes: 2, mimeType: 'text/plain' });
  store.read = async function* () { yield Buffer.from('ok'); };
  expect((await resolver.read('asset')).data.toString()).toBe('ok');
});
