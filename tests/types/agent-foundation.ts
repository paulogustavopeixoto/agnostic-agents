import {
  Agent, ContextWindow, FunctionProducer, ProducerRuntime, ProducerTool,
  ScopedRunStore, ScopedLayerStore, ScopedRetriever, InMemoryRunStore,
  InMemoryLayerStore, GuardedProvider, Memory, ArtifactResolver, ProducerJobRunner,
  InMemoryRunLock, FileRunLock, RunBudget, ApprovalSigner, SchemaSafety, ContentEnvelope,
  RealtimeSession, EpisodicMemory, LocalVectorStore, ScopedVectorStore, MCPClient, TraceSerializer,
  ProviderCatalog, MistralAdapter, XAIAdapter, ElevenLabsProducer, FalJobBackend, HiggsfieldJobBackend,
  QdrantVectorStore, PgVectorStore, PineconeVectorStore,
  FileVectorStore, HFAdapter, EmbeddingRecord,
} from '../..';

const embeddingBatch = (adapter: HFAdapter): Promise<EmbeddingRecord[]> => adapter.embedChunks(['fact'], {
  model: 'example/pooled-model', signal: new AbortController().signal,
});
void embeddingBatch;

const store = new ScopedRunStore({ store: new InMemoryRunStore(), tenantId: 'test' });
const memory = new Memory({ conversationStore: new ScopedLayerStore({ store: new InMemoryLayerStore(), tenantId: 'test' }) });
const provider = new GuardedProvider({ id: 'custom', provider: { generateText: async () => ({ message: 'done' }) },
  authorize: async () => true });
const producer = new FunctionProducer({ id: 'media', operations: {
  generate: async () => ({ content: [{ type: 'image', artifactId: 'image', mimeType: 'image/png' }] }),
}, streams: { text: async function* () { yield { type: 'content', content: [{ type: 'text', text: 'hello' }] }; } } });
const runtime = new ProducerRuntime({ producer, runStore: store, maxOutputBytes: 1000 });
const tool = new ProducerTool({ name: 'generate', runtime, operation: 'generate', toContent: () => [] });
const contextWindow = new ContextWindow({ maxTokens: 4000, countTokens: async request => request.messages.length,
  summarize: async request => `${request.sourceIndices.length} sources` });
const agent = new Agent(provider, { runStore: store, memory, tools: [tool], contextWindow,
  executionLimits: { modelCalls: 3 }, authorizeResume: async () => true, outputSchema: { type: 'string' } });
void agent.run('ask', { signal: new AbortController().signal });
void memory.storeConversation('ask', 'answer');
void runtime.stream({ operation: 'text', content: [] });
void new ScopedRetriever({ retriever: { search: async () => ({ matches: [] }) }, tenantId: 'test', authorizeQuery: async () => true });
void new ArtifactResolver({ tenantId: 'test', authorize: async () => true, store: {
  stat: async () => ({ tenantId: 'test', sizeBytes: 0 }), read: async function* () {},
} });
void new ProducerJobRunner({ runStore: store, authorize: async () => true, backend: {
  start: async () => ({ jobId: 'test' }), poll: async () => ({ status: 'pending' }),
} });
const budget = new RunBudget({ limits: { tokens: 1000 }, estimate: async () => ({ tokens: 100 }) });
const direct = new Agent(null, { tools: [tool], budget, runLock: new InMemoryRunLock(),
  approvalSigner: new ApprovalSigner({ key: 'x'.repeat(32) }), invocationTimeoutMs: 1000,
  schemaSafety: { maxDepth: 20 } });
void direct.runTool('generate', {});
void agent.runMedia('generateImage', 'A lighthouse');
void memory.flushStorage();
void memory.clearWorkingMemory();
void new FileRunLock({ directory: '/tmp/example-locks' });
void new SchemaSafety().assertSchema({ type: 'string' });
void ContentEnvelope.migrate({ content: [] }, { fromVersion: 'legacy' });
void TraceSerializer.migrateTrace({});
void new EpisodicMemory({ store: new InMemoryLayerStore(), tenantId: 'test', authorize: async () => true });
void new ScopedVectorStore({ store: new LocalVectorStore(), tenantId: 'test', authorize: async () => true });
void new MCPClient({ transport: async () => ({ tools: [] }) });
void new RealtimeSession({ authorize: async () => true, transport: {
  connect: async () => {}, send: async () => {}, interrupt: async () => {}, close: async () => {},
  events: async function* () { yield { type: 'end', epoch: 0 }; },
} });
void ProviderCatalog.list();
void new MistralAdapter('key', { model: 'host-selected' });
void new XAIAdapter('key', { model: 'host-selected' });
const speech = new ElevenLabsProducer({ apiKey: 'key', voiceId: 'voice', model: 'host-selected',
  saveArtifact: async () => ({ artifactId: 'audio' }) });
void new ProducerRuntime({ producer: speech });
const mediaOptions = { apiKey: 'key', modelPath: 'owner/model', operation: 'generateImage' as const,
  toInput: () => ({ prompt: 'test' }), toContent: () => [{ type: 'image' as const, artifactId: 'image', mimeType: 'image/png' }] };
void new ProducerJobRunner({ runStore: store, authorize: async () => true, backend: new FalJobBackend(mediaOptions) });
void new HiggsfieldJobBackend(mediaOptions);
void new QdrantVectorStore({ collection: 'agents', client: { upsert: async () => ({}),
  query: async () => ({ points: [] }), delete: async () => ({}) } });
void new PgVectorStore({ dimensions: 2, client: { query: async () => ({ rows: [] }) } });
void new PineconeVectorStore({ index: { namespace: () => ({}) } });
void new FileVectorStore({ filePath: '/tmp/agent-vector-example.json', maxEntries: 1000 });
