const { createHash } = require('crypto');
const contract = require('./VectorContract');

function pointId(namespace, id) {
  const bytes = createHash('sha256').update(JSON.stringify([namespace, id])).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 0x50; bytes[8] = (bytes[8] & 63) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function translate(node) {
  if (node.op === 'and' || node.op === 'or') {
    return { [node.op === 'and' ? 'must' : 'should']: node.children.map(translate) };
  }
  const key = `metadata.${node.key}`;
  if (node.op === 'exists') {
    const empty = { is_empty: { key } };
    const isNull = { is_null: { key } };
    return node.value ? { should: [{ must_not: [empty] }, isNull] } : { must: [empty], must_not: [isNull] };
  }
  if (node.op === 'in' || node.op === 'nin') {
    const alternatives = node.value.map(value => translate({ op: 'eq', key: node.key, value }));
    const any = alternatives.length ? { should: alternatives } : { must_not: [{ must: [] }] };
    return node.op === 'nin' ? { must_not: [any] } : any;
  }
  const match = typeof node.value === 'number' && !Number.isSafeInteger(node.value)
    ? { key, range: { gte: node.value, lte: node.value } } : { key, match: { value: node.value } };
  return node.op === 'ne' || node.op === 'nin' ? { must_not: [match] } : match;
}

class QdrantVectorStore {
  constructor({ client, collection, timeoutMs = 30000 } = {}) {
    if (['upsert', 'query', 'delete'].some(key => typeof client?.[key] !== 'function') ||
        typeof collection !== 'string' || !/^[\w-]+$/.test(collection)) throw new TypeError('Invalid Qdrant configuration.');
    Object.assign(this, { client, collection });
    this.timeoutMs = contract.timeout(timeoutMs);
    this.capabilities = { namespaceIsolation: true };
  }
  _scope(ns, filter = {}) {
    return { must: [{ key: '__aa_namespace', match: { value: ns } }, translate(contract.filterTree(filter))] };
  }
  async upsert({ vectors, namespace = '' }) {
    const ns = contract.namespace(namespace); contract.records(vectors);
    const request = { wait: true, points: vectors.map(record => ({ id: pointId(ns, record.id),
      vector: [...record.values], payload: { __aa_namespace: ns, __aa_id: record.id,
        metadata: JSON.parse(JSON.stringify(record.metadata || {})) } })) };
    await contract.invoke(() => this.client.upsert(this.collection, request), { timeoutMs: this.timeoutMs, write: true });
    return { insertedIds: vectors.map(record => record.id) };
  }
  async query({ vector, namespace = '', topK = 5, filter = {} }) {
    contract.vector(vector); const ns = contract.namespace(namespace);
    const request = { query: vector, limit: contract.limit(topK), with_payload: true, filter: this._scope(ns, filter) };
    const result = await contract.invoke(() => this.client.query(this.collection, request), { timeoutMs: this.timeoutMs });
    if (!Array.isArray(result?.points) || result.points.length > topK || result.points.some(point => point.payload?.__aa_namespace !== ns ||
        typeof point.payload?.__aa_id !== 'string' || !Number.isFinite(point.score))) throw new Error('Qdrant result scope violation.');
    return { matches: result.points.map(point => ({ id: point.payload.__aa_id, score: point.score,
      metadata: contract.metadata(point.payload.metadata) })) };
  }
  async delete({ ids, namespace = '' }) {
    contract.ids(ids); const ns = contract.namespace(namespace);
    if (!ids.length) return;
    await contract.invoke(() => this.client.delete(this.collection, { wait: true, filter: { must: [
      { key: '__aa_namespace', match: { value: ns } }, { has_id: ids.map(id => pointId(ns, id)) },
    ] } }), { timeoutMs: this.timeoutMs, write: true });
  }
  async deleteAll({ namespace = '' } = {}) {
    const ns = contract.namespace(namespace);
    await contract.invoke(() => this.client.delete(this.collection, { wait: true, filter: { must: [{ key: '__aa_namespace', match: { value: ns } }] } }),
      { timeoutMs: this.timeoutMs, write: true });
  }
}
module.exports = { QdrantVectorStore };
