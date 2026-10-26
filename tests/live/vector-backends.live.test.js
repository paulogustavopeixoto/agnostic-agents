require('dotenv').config();
const { randomUUID } = require('crypto');
const { PineconeVectorStore, QdrantVectorStore, PgVectorStore, ScopedVectorStore } = require('../..');
const { verifyLiveCall } = require('../../scripts/certifyProviders');
const { targets } = require('../../scripts/certifyVectors');
const live = process.env.RUN_LIVE_VECTOR_TESTS === '1';
const suite = live ? describe : describe.skip;
jest.setTimeout(180000);

async function eventually(read, check) {
  for (let attempt = 0; attempt < 15; attempt++) {
    const value = await read();
    if (check(value)) return;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Vector visibility/deletion did not converge within the test window.');
}

suite('Live vector backend conformance', () => {
  for (const target of targets) {
    const configured = target.requiredEnv.every(key => process.env[key]?.trim());
    (configured ? test : test.skip)(`${target.id} isolates namespaces and deletes only test records`, async () => {
      await verifyLiveCall(async () => {
        const dimensions = Number(process.env[`${target.id.toUpperCase()}_TEST_DIMENSIONS`]);
        if (!Number.isSafeInteger(dimensions) || dimensions < 1 || dimensions > 16000) throw new Error('Invalid test dimensions.');
        let store;
        let close = async () => {};
        if (target.id === 'pinecone') {
          const { Pinecone } = require('@pinecone-database/pinecone');
          const client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
          store = new PineconeVectorStore({ index: client.Index(process.env.PINECONE_TEST_INDEX), timeoutMs: 10000 });
        } else if (target.id === 'qdrant') {
          const { QdrantClient } = require('@qdrant/js-client-rest');
          const client = new QdrantClient({ url: process.env.QDRANT_TEST_URL, apiKey: process.env.QDRANT_API_KEY, timeout: 10000 });
          store = new QdrantVectorStore({ client, collection: process.env.QDRANT_TEST_COLLECTION, timeoutMs: 10000 });
        } else {
          const { Pool } = require('pg');
          const client = new Pool({ connectionString: process.env.PGVECTOR_DATABASE_URL, max: 1,
            connectionTimeoutMillis: 10000, statement_timeout: 10000 });
          close = () => client.end();
          store = new PgVectorStore({ client, table: process.env.PGVECTOR_TEST_TABLE, dimensions, timeoutMs: 10000 });
        }
        const prefix = `aa-cert-${randomUUID()}`;
        const a = new ScopedVectorStore({ store, tenantId: `${prefix}-a`, authorize: async () => true });
        const b = new ScopedVectorStore({ store, tenantId: `${prefix}-b`, authorize: async () => true });
        const vector = [1, ...Array(dimensions - 1).fill(0)];
        try {
          await a.upsert({ vectors: [{ id: 'same', values: vector, metadata: { category: 'test' } }] });
          await b.upsert({ vectors: [{ id: 'same', values: vector, metadata: { category: 'test' } }] });
          await eventually(() => a.query({ vector, filter: { category: 'test' } }), result => result.matches.length === 1);
          await eventually(() => b.query({ vector }), result => result.matches.length === 1);
          await a.delete({ ids: ['same'] });
          await eventually(() => a.query({ vector }), result => result.matches.length === 0);
          expect((await b.query({ vector })).matches).toHaveLength(1);
          await b.deleteAll();
          await eventually(() => b.query({ vector }), result => result.matches.length === 0);
        } finally {
          try {
            const cleanup = await Promise.allSettled([a.deleteAll(), b.deleteAll()]);
            if (cleanup.some(result => result.status === 'rejected')) throw new Error('Test namespace cleanup failed.');
          } finally { await close(); }
        }
      });
    });
  }
});
