const contract = require('./VectorContract');

/** Bind one existing SDK v4 Index; provisioning remains host-owned. */
class PineconeVectorStore {
  constructor({ index, timeoutMs = 30000 } = {}) {
    if (typeof index?.namespace !== 'function') throw new TypeError('A Pinecone Index is required.');
    this.index = index;
    this.timeoutMs = contract.timeout(timeoutMs);
    this.capabilities = { namespaceIsolation: true };
  }
  async upsert({ vectors, namespace = '' }) {
    contract.records(vectors);
    const scoped = this.index.namespace(contract.namespace(namespace));
    await contract.invoke(() => scoped.upsert(vectors), { timeoutMs: this.timeoutMs, write: true });
    return { insertedIds: vectors.map(record => record.id) };
  }
  async query({ vector, namespace = '', topK = 5, filter = {} }) {
    contract.vector(vector); contract.filterTree(filter);
    const scoped = this.index.namespace(contract.namespace(namespace));
    const request = { vector, topK: contract.limit(topK), includeMetadata: true, ...(Object.keys(filter).length ? { filter } : {}) };
    const result = await contract.invoke(() => scoped.query(request), { timeoutMs: this.timeoutMs });
    if (!Array.isArray(result?.matches) || result.matches.length > topK || result.matches.some(match => typeof match.id !== 'string' || !Number.isFinite(match.score))) {
      throw new Error('Invalid Pinecone query result.');
    }
    return { matches: result.matches.map(match => ({ id: match.id, score: match.score, metadata: contract.metadata(match.metadata) })) };
  }
  async delete({ ids, namespace = '' }) {
    contract.ids(ids); const scoped = this.index.namespace(contract.namespace(namespace));
    if (ids.length) await contract.invoke(() => scoped.deleteMany(ids), { timeoutMs: this.timeoutMs, write: true });
  }
  async deleteAll({ namespace = '' } = {}) {
    const scoped = this.index.namespace(contract.namespace(namespace));
    await contract.invoke(() => scoped.deleteAll(), { timeoutMs: this.timeoutMs, write: true });
  }
}
module.exports = { PineconeVectorStore };
