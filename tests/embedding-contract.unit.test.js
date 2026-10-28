const { RAG, Memory, LocalVectorStore } = require('..');
const { HFAdapter } = require('../src/llm/huggingFace');
const { VectorStoreRetriever } = require('../src/rag/retrievers/VectorStoreRetriever');
const { RetryManager } = require('../src/utils/RetryManager');
const noRetry = () => new RetryManager({ retries: 0 });

test('Hugging Face embeddings work end-to-end with RAG and semantic memory', async () => {
  const adapter = new HFAdapter('synthetic', { retryManager: noRetry() });
  adapter.inference = { featureExtraction: jest.fn(async () => [1, 0]) };
  const vectorStore = new LocalVectorStore();
  const rag = new RAG({ adapter, vectorStore, retryManager: noRetry() });
  await rag.index('reference document');
  expect((await rag.searchWithProvenance('query')).matches[0].text).toBe('reference document');
  const memory = new Memory({ adapter, vectorStore });
  expect(await memory._getEmbedding('fact')).toEqual([1, 0]);
  expect(await adapter.embedChunks(['fact'])).toEqual([{ embedding: [1, 0] }]);
});

test.each([
  [], [{ embedding: [1] }, { embedding: [1] }], [{ embedding: [] }],
  [{ embedding: [NaN] }], [{ embedding: [Infinity] }], [{ embedding: new Array(2) }],
  [{ embedding: [[1, 2]] }], [{ embedding: [1], index: 2 }],
].map(batch => [batch]))('invalid embeddings never reach indexing or query backends (%j)', async batch => {
  const adapter = { embedChunks: async () => batch };
  const vectorStore = { upsert: jest.fn(), query: jest.fn() };
  const rag = new RAG({ adapter, vectorStore, retryManager: noRetry() });
  await expect(rag.index('document')).rejects.toMatchObject({ retryable: false });
  await expect(new VectorStoreRetriever({ adapter, vectorStore }).search('query')).rejects.toMatchObject({ retryable: false });
  expect(vectorStore.upsert).not.toHaveBeenCalled(); expect(vectorStore.query).not.toHaveBeenCalled();
});

test('indexed provider records are reordered before binding chunks to vectors', async () => {
  const adapter = { embedChunks: async () => [{ index: 1, embedding: [0, 1] }, { index: 0, embedding: [1, 0] }] };
  const vectorStore = { upsert: jest.fn(async ({ vectors }) => ({ insertedIds: vectors.map(v => v.id) })) };
  await new RAG({ adapter, vectorStore, retryManager: noRetry() }).index(['first', 'second']);
  expect(vectorStore.upsert.mock.calls[0][0].vectors.map(v => ({ text: v.metadata.text, values: v.values })))
    .toEqual([{ text: 'first', values: [1, 0] }, { text: 'second', values: [0, 1] }]);
});

test.each([
  [{ index: 0, embedding: [1] }, { index: 0, embedding: [2] }],
  [{ index: 0, embedding: [1] }, { embedding: [2] }],
  [{ embedding: [1] }, { embedding: [1, 2] }],
  new Array(2),
].map(batch => [batch]))('ambiguous or malformed batches reject before any writes (%j)', async batch => {
  const vectorStore = { upsert: jest.fn() };
  await expect(new RAG({ adapter: { embedChunks: async () => batch }, vectorStore, retryManager: noRetry() })
    .index(['first', 'second'])).rejects.toMatchObject({ retryable: false });
  expect(vectorStore.upsert).not.toHaveBeenCalled();
});

test('custom adapters with legacy raw vector arrays remain usable and results are detached', async () => {
  const values = [1, 0];
  const memory = new Memory({ adapter: { embedChunks: async () => [values] } });
  const result = await memory._getEmbedding('fact');
  values[0] = 9;
  expect(result).toEqual([1, 0]);
});
