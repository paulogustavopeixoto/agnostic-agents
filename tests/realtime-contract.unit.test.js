const { RealtimeSession, ContentEnvelope, GuardedProvider, TraceSerializer, Run, ProducerRuntime, FunctionProducer } = require('..');

function transport(events) {
  return { connect: jest.fn(async () => {}), send: jest.fn(async () => {}), interrupt: jest.fn(async () => {}),
    close: jest.fn(async () => {}), events: async function* () { for (const event of events) yield event; } };
}

test('live sessions support barge-in and discard stale output without persisting media', async () => {
  const backend = transport([
    { type: 'audio', data: Buffer.from('first-private-audio'), mimeType: 'audio/pcm', epoch: 0 },
    { type: 'audio', data: Buffer.from('stale-private-audio'), mimeType: 'audio/pcm', epoch: 0 },
    { type: 'audio', data: Buffer.from('new-private-audio'), mimeType: 'audio/pcm', epoch: 1 }, { type: 'end', epoch: 1 },
  ]);
  const session = new RealtimeSession({ transport: backend, authorize: async () => true });
  await session.open();
  await session.send({ type: 'audio', data: Buffer.from('input-private-audio'), mimeType: 'audio/pcm' });
  const reader = session.events();
  expect((await reader.next()).value.data.toString()).toBe('first-private-audio');
  await session.interrupt();
  expect((await reader.next()).value.data.toString()).toBe('new-private-audio');
  expect((await reader.next()).done).toBe(true);
  expect(session.run.status).toBe('completed');
  expect(JSON.stringify(session.run)).not.toContain('private-audio');
  expect(backend.close).toHaveBeenCalledTimes(1);
});

test('interrupting session iteration cancels the run and closes the transport', async () => {
  const backend = transport([{ type: 'text', text: 'hello', epoch: 0 }]);
  const session = new RealtimeSession({ transport: backend, authorize: async () => true });
  await session.open();
  for await (const event of session.events()) { expect(event.text).toBe('hello'); break; }
  expect(session.run.status).toBe('cancelled');
  expect(backend.close).toHaveBeenCalledTimes(1);
});

test('media size and authorization checks prevent sending frames', async () => {
  const backend = transport([]);
  const session = new RealtimeSession({ transport: backend, authorize: async () => true, maxFrameBytes: 1 });
  await session.open();
  await expect(session.send({ type: 'audio', data: Buffer.from('large'), mimeType: 'audio/pcm' })).rejects.toThrow('budget');
  expect(backend.send).not.toHaveBeenCalled();
  const denied = new RealtimeSession({ transport: backend, authorize: async () => false });
  await expect(denied.open()).rejects.toThrow('denied');
  expect(backend.connect).toHaveBeenCalledTimes(1);
});

test('content envelopes reject unknown versions and explicitly migrate legacy content', () => {
  const envelope = ContentEnvelope.migrate({ content: [{ type: 'text', text: 'partial' }], status: 'incomplete' }, { fromVersion: 'legacy' });
  expect(ContentEnvelope.parse(envelope).status).toBe('incomplete');
  expect(() => ContentEnvelope.parse({ ...envelope, version: '99' })).toThrow('version');
  expect(() => ContentEnvelope.migrate(envelope, { fromVersion: '99' })).toThrow('migration');
});

test('trace migrations preserve run content and reject unknown schema versions', () => {
  const trace = { ...TraceSerializer.exportRun(new Run({ input: 'saved' })), schemaVersion: '1.0' };
  expect(TraceSerializer.migrateTrace(trace).schemaVersion).toBe('1.1');
  expect(TraceSerializer.importRun(trace).input).toBe('saved');
  expect(() => TraceSerializer.importRun({ ...trace, schemaVersion: '99' })).toThrow('Unsupported');
});

test('model-level capability maps reject unsupported combinations before provider calls', async () => {
  const provider = { generateText: jest.fn(async () => ({ message: 'ok' })), generateAudio: jest.fn(async () => Buffer.from('audio')) };
  const guarded = new GuardedProvider({ id: 'custom', provider, authorize: async () => true,
    models: { text: { generateText: true }, speech: { audioGeneration: true } }, defaultModel: 'text' });
  await guarded.generateText('hello');
  await expect(guarded.generateAudio('hello')).rejects.toThrow('Selected model');
  await guarded.generateAudio('hello', { model: 'speech' });
  expect(provider.generateAudio).toHaveBeenCalledTimes(1);
});

test('producer incomplete output pauses rather than claiming successful completion', async () => {
  const runtime = new ProducerRuntime({ producer: new FunctionProducer({ id: 'partial', operations: {
    generate: async () => ({ completionStatus: 'incomplete', content: [{ type: 'text', text: 'partial' }] }),
  } }) });
  const run = await runtime.run({ operation: 'generate', content: [] });
  expect(run.status).toBe('paused');
  expect(run.state.resultStatus).toBe('incomplete');
});
