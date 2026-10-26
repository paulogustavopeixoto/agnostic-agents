// Offline contract demonstration, not a live provider or a production deployment.
const assert = require('node:assert/strict');
const {
  Agent, FunctionProducer, ProducerRuntime, ProducerTool, GuardedProvider,
  ScopedRunStore, ScopedLayerStore, ScopedRetriever, InMemoryRunStore,
  InMemoryLayerStore, Memory, RAG, ArtifactResolver,
} = require('..');

async function main() {
  // In a service, bind this value from authenticated host context.
  const tenantId = 'example-tenant';
  const runStore = new ScopedRunStore({ tenantId, store: new InMemoryRunStore() });
  const memory = new Memory({
    conversationStore: new ScopedLayerStore({ tenantId, store: new InMemoryLayerStore() }),
    policies: { conversationLimit: 2 },
  });
  const provider = new GuardedProvider({ id: 'offline-text', authorize: async request =>
    request.providerId === 'offline-text' && request.operation === 'generateText',
  provider: {
    generateText: async messages => messages.some(message => message.role === 'function')
      ? { message: JSON.stringify({ answer: 'Image prepared.', artifactId: 'example-image' }) }
      : { toolCalls: [{ name: 'make_image', arguments: { prompt: 'A lighthouse' } }] },
  } });
  const retriever = new ScopedRetriever({ tenantId, authorizeQuery: async () => true,
    retriever: { search: async () => ({ matches: [{ id: 'brand-guide', text: 'Use a coastal theme.',
      metadata: { tenantId, source: 'offline-brand-guide' } }] }) } });
  const rag = new RAG({ adapter: provider, retriever });
  const runtime = new ProducerRuntime({ runStore, authorize: async request => request.operation === 'image',
    producer: new FunctionProducer({ id: 'offline-image', operations: {
      image: async () => ({ content: [{ type: 'image', artifactId: 'example-image', mimeType: 'image/png' }] }),
    } }) });
  const tool = new ProducerTool({ name: 'make_image', runtime, operation: 'image',
    parameters: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] },
    toContent: args => [{ type: 'text', text: args.prompt }], maxCallsPerRun: 1 });
  const agent = new Agent(provider, { tools: [tool], memory, rag, runStore,
    // Explicit offline-only verifier. Replace with actual action checks in a service.
    toolPolicy: { allowTools: ['make_image'], verify: async () => ({ action: 'allow' }) },
    contextWindow: { maxTokens: 4096, reserveOutputTokens: 256 },
    executionLimits: { modelCalls: 3, toolCalls: 1 },
    outputSchema: { type: 'object', required: ['answer', 'artifactId'],
      properties: { answer: { type: 'string' }, artifactId: { type: 'string' } }, additionalProperties: false },
  });
  const run = await agent.run('Create an image using the brand guide.');
  const child = await runStore.getRun(run.metadata.lineage.childRunIds[0]);
  assert.equal(run.status, 'completed');
  assert.equal(child.metadata.lineage.parentRunId, run.id);
  assert.equal((await memory.getConversationHistory()).length, 1);

  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS9sAAAAASUVORK5CYII=', 'base64');
  const resolver = new ArtifactResolver({ tenantId, authorize: async request => request.artifactId === 'example-image',
    store: { stat: async () => ({ tenantId, sizeBytes: bytes.length, mimeType: 'image/png' }),
      read: async function* () { yield bytes; } } });
  const artifact = await resolver.read(run.output.artifactId);
  console.log(JSON.stringify({ status: run.status, childStatus: child.status,
    runCount: (await runStore.listRuns()).length, sources: run.state.retrieval.matches.length,
    output: run.output, artifactBytes: artifact.data.length }, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
