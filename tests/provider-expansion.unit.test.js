const { MistralAdapter, XAIAdapter, ElevenLabsProducer, FalJobBackend, HiggsfieldJobBackend,
  ProviderCatalog, Agent, Tool, ProducerRuntime, ProducerJobRunner, InMemoryRunStore } = require('..');
const { BoundedHttpClient } = require('../src/utils/BoundedHttpClient');

const json = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
const completion = (message, finish_reason = 'stop') => json({ choices: [{ message, finish_reason }],
  usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 } });

test('catalog has ten independent provider entries and three vector backends, with detached records', () => {
  expect(ProviderCatalog.list()).toHaveLength(10);
  expect(new Set(ProviderCatalog.list().map(target => target.id)).size).toBe(10);
  expect(ProviderCatalog.list().map(target => target.id)).toEqual(expect.arrayContaining(['huggingface', 'higgsfield', 'elevenlabs']));
  const targets = ProviderCatalog.list(); targets[0].requiredEnv.length = 0;
  expect(ProviderCatalog.list()[0].requiredEnv.length).toBeGreaterThan(0);
  expect(ProviderCatalog.vectorStores().map(target => target.id)).toEqual(['pinecone', 'qdrant', 'pgvector']);
});

test.each([[MistralAdapter, 'https://api.mistral.ai'], [XAIAdapter, 'https://api.x.ai']])(
  '%p normalizes text, modern tools, signals and explicit unsupported capabilities', async (Adapter, origin) => {
    const fetchImpl = jest.fn(async () => completion({ content: 'hello' }));
    const adapter = new Adapter('test-key', { model: 'host-selected', fetchImpl });
    const result = await adapter.generateText('hello', { temperature: 0 });
    expect(result).toMatchObject({ message: 'hello', completionStatus: 'completed', usage: { total: 3 } });
    expect(fetchImpl.mock.calls[0][0]).toBe(`${origin}/v1/chat/completions`);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).temperature).toBe(0);
    expect(fetchImpl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    await expect(adapter.generateImage({ user: 'image' })).rejects.toThrow('does not support');
    fetchImpl.mockImplementationOnce(async () => completion({ content: null, tool_calls: [{ id: 'call1', type: 'function',
      function: { name: 'read', arguments: '{"id":1}' } }] }, 'tool_calls'));
    const tool = new Tool({ name: 'read', implementation: async () => 'ok' });
    expect((await adapter.generateText('read', { tools: [tool] })).toolCalls[0]).toMatchObject({ name: 'read', arguments: { id: 1 } });
    const request = JSON.parse(fetchImpl.mock.calls[1][1].body);
    expect(request.tools[0].type).toBe('function');
  });

test('new chat adapters execute through the Agent tool loop and bind repeated legacy tool IDs', async () => {
  const fetchImpl = jest.fn()
    .mockImplementationOnce(async () => completion({ content: null, tool_calls: [{ id: 'remote',
      function: { name: 'read', arguments: '{}' } }] }, 'tool_calls'))
    .mockImplementation(async () => completion({ content: 'done' }));
  const adapter = new MistralAdapter('key', { model: 'model', fetchImpl });
  const agent = new Agent(adapter, { tools: [new Tool({ name: 'read', implementation: async () => ({ ok: true }) })] });
  expect((await agent.run('read')).output).toBe('done');
  const messages = JSON.parse(fetchImpl.mock.calls[1][1].body).messages;
  const assistant = messages.find(message => message.tool_calls);
  expect(messages.find(message => message.role === 'tool').tool_call_id).toBe(assistant.tool_calls[0].id);
});

test('malformed provider arguments fail without leaking raw content; truncation stays incomplete', async () => {
  const fetchImpl = jest.fn(async () => completion({ content: null, tool_calls: [{ function: { name: 'read', arguments: 'private-secret' } }] }));
  const adapter = new XAIAdapter('key', { model: 'model', fetchImpl });
  await expect(adapter.generateText('read')).rejects.toThrow('Invalid provider chat result');
  fetchImpl.mockImplementationOnce(async () => completion({ content: 'partial' }, 'length'));
  expect((await adapter.generateText('read')).completionStatus).toBe('incomplete');
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});

test('bounded transport rejects redirects, off-origin URLs, oversized streams and raw error leakage', async () => {
  const fetchImpl = jest.fn(async () => new Response('private-secret', { status: 429 }));
  const client = new BoundedHttpClient({ origin: 'https://example.com', headers: { Authorization: 'test-secret' }, fetchImpl, maxBytes: 8 });
  await expect(client.request({ path: '//evil.example.com' })).rejects.toThrow('Invalid');
  expect(fetchImpl).not.toHaveBeenCalled();
  await expect(client.request({ path: '/read' })).rejects.toThrow('Provider HTTP request did not complete');
  expect(fetchImpl.mock.calls[0][1].redirect).toBe('error');
  fetchImpl.mockImplementationOnce(async () => new Response('x'.repeat(9)));
  await expect(client.request({ path: '/read', method: 'GET' })).rejects.toThrow('did not complete');
  fetchImpl.mockImplementationOnce(async () => new Promise(() => {}));
  const timed = new BoundedHttpClient({ origin: 'https://example.com', fetchImpl, timeoutMs: 5 });
  await expect(timed.request({ path: '/write' })).rejects.toMatchObject({ retryable: false, uncertain: true });
});

test('ElevenLabs stores bounded audio through host artifact handling and returns opaque references', async () => {
  const fetchImpl = jest.fn(async () => new Response(Buffer.from('audio'), { headers: { 'content-type': 'audio/mpeg' } }));
  const saveArtifact = jest.fn(async () => ({ artifactId: 'tenant/audio1' }));
  const producer = new ElevenLabsProducer({ apiKey: 'key', voiceId: 'voice', model: 'model', fetchImpl, saveArtifact });
  const run = await new ProducerRuntime({ producer, authorize: async () => true }).run({ operation: 'generateAudio', content: [{ type: 'text', text: 'hello' }] });
  expect(run.status).toBe('completed');
  expect(run.output.content[0]).toEqual({ type: 'audio', artifactId: 'tenant/audio1', mimeType: 'audio/mpeg' });
  expect(saveArtifact.mock.calls[0][0].data.toString()).toBe('audio');
  expect(JSON.stringify(run)).not.toContain('xi-api-key');
  await expect(producer.produce({ operation: 'generateImage', content: [] })).rejects.toThrow('Unsupported');
});

test.each([[FalJobBackend, 'https://queue.fal.run', 'IN_QUEUE', 'COMPLETED'],
  [HiggsfieldJobBackend, 'https://api.higgsfield.ai', 'queued', 'completed']])(
  '%p starts once, polls persisted IDs, and never follows returned asset/status URLs', async (Backend, origin, pending, done) => {
    const fetchImpl = jest.fn()
      .mockImplementationOnce(async () => json({ request_id: 'job-1', status_url: 'https://evil.example/status' }))
      .mockImplementationOnce(async () => json({ status: pending }))
      .mockImplementationOnce(async () => json({ status: done, images: [{ url: 'https://cdn.example/asset' }] }))
      .mockImplementation(async () => json({ images: [{ url: 'https://cdn.example/asset' }] }));
    const toContent = jest.fn(async () => [{ type: 'image', artifactId: 'tenant/image', mimeType: 'image/png' }]);
    const backend = new Backend({ apiKey: 'key', modelPath: 'owner/model/variant', operation: 'generateImage',
      toInput: request => ({ prompt: request.content[0].text }), toContent, fetchImpl });
    const runner = new ProducerJobRunner({ backend, runStore: new InMemoryRunStore(), authorize: async () => true,
      maxPolls: 2, pollIntervalMs: 0 });
    const run = await runner.start({ operation: 'generateImage', content: [{ type: 'text', text: 'image' }] });
    expect(run.state.remoteJob.jobId).toBe('job-1');
    expect((await runner.resume(run.id)).status).toBe('completed');
    expect(fetchImpl.mock.calls.filter(([, request]) => request.method === 'POST')).toHaveLength(1);
    expect(fetchImpl.mock.calls.every(([url]) => url.startsWith(origin))).toBe(true);
    expect(toContent).toHaveBeenCalledTimes(1);
    expect(toContent.mock.calls[0][1].jobId).toBe('job-1');
  });

test('failed and unknown media job states cannot masquerade as output; cancellation is only a request', async () => {
  const fetchImpl = jest.fn(async () => json({ status: 'nsfw' }));
  const toContent = jest.fn();
  const backend = new HiggsfieldJobBackend({ apiKey: 'key', modelPath: 'owner/model', operation: 'generateVideo',
    toInput: () => ({}), toContent, fetchImpl });
  expect(await backend.poll('job')).toEqual({ status: 'failed' });
  expect(toContent).not.toHaveBeenCalled();
  fetchImpl.mockImplementationOnce(async () => json({ status: 'surprise' }));
  await expect(backend.poll('job')).rejects.toThrow('Unknown');
  fetchImpl.mockImplementationOnce(async () => new Response(null, { status: 204 }));
  expect(await backend.cancel('job')).toEqual({ cancellationRequested: true });
});

test('persisted media jobs cannot be resumed through a different provider/model binding', async () => {
  const runStore = new InMemoryRunStore();
  const poll = jest.fn(async () => ({ status: 'pending' }));
  const common = { runStore, authorize: async () => true };
  const a = new ProducerJobRunner({ ...common, backend: { id: 'provider-a:model', start: async () => ({ jobId: 'job' }), poll } });
  const b = new ProducerJobRunner({ ...common, backend: { id: 'provider-b:model', start: async () => ({ jobId: 'job' }), poll } });
  const run = await a.start({ operation: 'generateVideo', content: [] });
  await expect(b.resume(run.id)).rejects.toThrow('binding');
  expect(poll).not.toHaveBeenCalled();
});
