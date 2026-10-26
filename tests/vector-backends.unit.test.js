const { QdrantVectorStore, PgVectorStore, PineconeVectorStore, ScopedVectorStore,
  VectorStoreRetriever } = require('..');

test('Pinecone adapter binds every operation to the SDK namespace, including deleteAll', async () => {
  const records = new Map();
  const index = { namespace: jest.fn(ns => {
    if (!records.has(ns)) records.set(ns, new Map());
    const data = records.get(ns);
    return {
      upsert: async vectors => vectors.forEach(vector => data.set(vector.id, vector)),
      query: async () => ({ matches: [...data.values()].map(vector => ({ id: vector.id, metadata: vector.metadata, score: 1 })) }),
      deleteMany: async ids => ids.forEach(id => data.delete(id)), deleteAll: async () => data.clear(),
    };
  }) };
  const store = new PineconeVectorStore({ index });
  const a = new ScopedVectorStore({ store, tenantId: 'a', authorize: async () => true });
  const b = new ScopedVectorStore({ store, tenantId: 'b', authorize: async () => true });
  await a.upsert({ vectors: [{ id: 'same', values: [1, 0], metadata: { text: 'a' } }] });
  await b.upsert({ vectors: [{ id: 'same', values: [1, 0], metadata: { text: 'b' } }] });
  expect((await a.query({ vector: [1, 0] })).matches[0].metadata.text).toBe('a');
  await a.deleteAll();
  expect((await a.query({ vector: [1, 0] })).matches).toEqual([]);
  expect((await b.query({ vector: [1, 0] })).matches).toHaveLength(1);
  await b.delete({ ids: ['same'] });
  expect((await b.query({ vector: [1, 0] })).matches).toEqual([]);
  expect(index.namespace.mock.calls.every(([ns]) => ['a', 'b'].includes(ns))).toBe(true);
});

test('Qdrant uses namespace-derived point IDs, mandatory filters, and rejects wrong-scope responses', async () => {
  const client = { upsert: jest.fn(async () => ({})), delete: jest.fn(async () => ({})),
    query: jest.fn(async () => ({ points: [{ score: 1, payload: { __aa_namespace: 'a', __aa_id: 'same', metadata: { text: 'safe' } } }] })) };
  const store = new QdrantVectorStore({ client, collection: 'agents' });
  const vectors = [{ id: 'same', values: [1, 0], metadata: { tenantId: 'a' } }];
  await store.upsert({ namespace: 'a', vectors });
  await store.upsert({ namespace: 'b', vectors });
  const first = client.upsert.mock.calls[0][1].points[0];
  const second = client.upsert.mock.calls[1][1].points[0];
  expect(first.id).not.toBe(second.id);
  expect(first.id).toMatch(/^[\da-f-]{36}$/);
  expect(await store.query({ namespace: 'a', vector: [1, 0], filter: { category: { $in: ['one', 'two'] } } })).toMatchObject({ matches: [{ id: 'same' }] });
  expect(client.query.mock.calls[0][1].filter.must[0]).toEqual({ key: '__aa_namespace', match: { value: 'a' } });
  await expect(store.query({ namespace: 'b', vector: [1, 0] })).rejects.toThrow('scope');
  await store.delete({ namespace: 'a', ids: ['same'] });
  expect(client.delete.mock.calls[0][1].filter.must[1].has_id).toEqual([first.id]);
  await store.deleteAll({ namespace: 'a' });
  expect(client.delete.mock.calls[1][1].filter.must).toEqual([{ key: '__aa_namespace', match: { value: 'a' } }]);
});

test('Qdrant translates portable logical, existence, numeric, and negative filters without dropping scope', async () => {
  const client = { upsert: jest.fn(), delete: jest.fn(), query: jest.fn(async () => ({ points: [] })) };
  const store = new QdrantVectorStore({ client, collection: 'agents' });
  await store.query({ namespace: 'a', vector: [1], filter: { $or: [{ x: { $exists: true } }, { x: { $exists: false } }],
    score: { $eq: 0.2 }, flag: { $nin: [true, false] }, category: { $ne: 'private' } } });
  const filter = JSON.stringify(client.query.mock.calls[0][1].filter);
  expect(filter).toContain('metadata.score'); expect(filter).toContain('range');
  expect(filter).toContain('must_not'); expect(filter).toContain('__aa_namespace');
  await expect(store.query({ vector: [1], filter: { 'x.__aa_namespace': 'escape' } })).rejects.toThrow('metadata key');
  await expect(store.query({ vector: [1], filter: { value: { $regex: '.*' } } })).rejects.toThrow('Unsupported');
  expect(client.query).toHaveBeenCalledTimes(1);
});

test('pgvector binds namespaces, IDs, metadata and filter values as parameters, never SQL fragments', async () => {
  const client = { query: jest.fn(async sql => sql.startsWith('SELECT') ? { rows: [{ id: 'one', score: '0.9', metadata: { text: 'result' } }] } : { rows: [] }) };
  const store = new PgVectorStore({ client, dimensions: 2 });
  const secret = "tenant'); DROP TABLE agent_vectors; --";
  await store.upsert({ namespace: secret, vectors: [{ id: 'one', values: [1, 0], metadata: { tag: 'safe' } }] });
  const [insert, inserted] = client.query.mock.calls[0];
  expect(insert).toContain('ON CONFLICT (namespace, id)');
  expect(insert).not.toContain(secret); expect(inserted[0]).toBe(secret);
  const result = await store.query({ vector: [1, 0], namespace: secret,
    filter: { $and: [{ tag: { $eq: secret } }, { flag: { $exists: false } }, { category: { $nin: ['a', 'b'] } }] } });
  expect(result.matches[0].score).toBe(0.9);
  const [select, params] = client.query.mock.calls[1];
  expect(select).toContain('WHERE namespace = $2 AND');
  expect(select).not.toContain(secret); expect(params).toContain(JSON.stringify(secret));
  await store.delete({ namespace: secret, ids: ['one'] });
  await store.deleteAll({ namespace: secret });
  expect(client.query.mock.calls[2]).toEqual([expect.stringContaining('namespace = $1 AND id = ANY($2::text[])'), [secret, ['one']]]);
  expect(client.query.mock.calls[3]).toEqual([expect.stringContaining('WHERE namespace = $1'), [secret]]);
  expect(store.schemaSql).toContain('PRIMARY KEY (namespace, id)');
  expect(() => new PgVectorStore({ client, table: 'bad;DROP TABLE users', dimensions: 2 })).toThrow('Invalid');
});

test.each(['pinecone', 'qdrant', 'pgvector'])('%s rejects bad vectors and filters before calling a client', async kind => {
  const query = jest.fn();
  const store = kind === 'pinecone' ? new PineconeVectorStore({ index: { namespace: () => ({ query }) } }) :
    kind === 'qdrant' ? new QdrantVectorStore({ client: { query, upsert() {}, delete() {} }, collection: 'agents' }) :
      new PgVectorStore({ client: { query }, dimensions: 2 });
  await expect(store.query({ vector: [NaN] })).rejects.toThrow('Invalid');
  await expect(store.query({ vector: [1, 0], filter: { x: { $unsupported: 'value' } } })).rejects.toThrow('Unsupported');
  expect(query).not.toHaveBeenCalled();
});

test('vector adapters work behind the normal retriever and scoped wrapper', async () => {
  const store = new PgVectorStore({ dimensions: 2, client: { query: async () => ({ rows: [{ id: 'source', score: 1,
    metadata: { tenantId: 't', text: 'context' } }] }) } });
  const scoped = new ScopedVectorStore({ store, tenantId: 't', authorize: async () => true });
  const retriever = new VectorStoreRetriever({ vectorStore: scoped, adapter: { embedChunks: async () => [{ embedding: [1, 0] }] } });
  const result = await retriever.search('query');
  expect(result.matches[0]).toMatchObject({ id: 'source', text: 'context' });
});

test('vector deadlines and errors are non-retryable, sanitized, and conservatively uncertain for writes', async () => {
  const store = new PgVectorStore({ dimensions: 1, timeoutMs: 5, client: { query: () => new Promise(() => {}) } });
  await expect(store.upsert({ vectors: [{ id: 'one', values: [1] }] }))
    .rejects.toMatchObject({ retryable: false, uncertain: true, message: 'Vector backend operation did not complete.' });
  await expect(store.query({ vector: [1] })).rejects.toMatchObject({ retryable: false, uncertain: false });
});

test('legacy Pinecone manager deletion uses the bundled SDK namespace API without logging responses', async () => {
  const { PineconeManager } = require('..');
  const deletion = jest.fn(async () => {});
  const namespace = jest.fn(() => ({ deleteAll: deletion }));
  const manager = Object.create(PineconeManager.prototype);
  manager.client = { Index: () => ({ namespace }) };
  await manager.deleteAll({ indexName: 'test', namespace: 'tenant' });
  expect(namespace).toHaveBeenCalledWith('tenant');
  expect(deletion).toHaveBeenCalledTimes(1);
  await expect(manager.deleteAll({ indexName: 'test' })).rejects.toThrow('explicit namespace');
});
