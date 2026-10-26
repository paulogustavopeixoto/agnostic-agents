const contract = require('./VectorContract');

class PgVectorStore {
  constructor({ client, table = 'agent_vectors', dimensions, timeoutMs = 30000 } = {}) {
    if (typeof client?.query !== 'function' || !/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(table) ||
        !Number.isSafeInteger(dimensions) || dimensions < 1 || dimensions > 16000) throw new TypeError('Invalid pgvector configuration.');
    Object.assign(this, { client, table, dimensions });
    this.timeoutMs = contract.timeout(timeoutMs);
    this.capabilities = { namespaceIsolation: true };
  }
  get schemaSql() {
    return `CREATE TABLE "${this.table}" (namespace text NOT NULL, id text NOT NULL, embedding vector(${this.dimensions}) NOT NULL, metadata jsonb NOT NULL DEFAULT '{}', PRIMARY KEY (namespace, id))`;
  }
  _vector(values) {
    contract.vector(values);
    if (values.length !== this.dimensions) throw new TypeError('Vector dimensions differ.');
    return JSON.stringify(values);
  }
  async upsert({ vectors, namespace = '' }) {
    contract.records(vectors); const ns = contract.namespace(namespace);
    const params = [];
    const rows = vectors.map(record => {
      const offset = params.length;
      params.push(ns, record.id, this._vector(record.values), JSON.stringify(record.metadata || {}));
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}::vector, $${offset + 4}::jsonb)`;
    });
    await contract.invoke(() => this.client.query(`INSERT INTO "${this.table}" (namespace, id, embedding, metadata) VALUES ${rows.join(', ')} ON CONFLICT (namespace, id) DO UPDATE SET embedding = EXCLUDED.embedding, metadata = EXCLUDED.metadata`, params),
      { timeoutMs: this.timeoutMs, write: true });
    return { insertedIds: vectors.map(record => record.id) };
  }
  async query({ vector, namespace = '', topK = 5, filter = {} }) {
    const params = [this._vector(vector), contract.namespace(namespace)];
    const bind = value => { params.push(value); return `$${params.length}`; };
    const translate = node => {
      if (node.op === 'and' || node.op === 'or') return node.children.length
        ? `(${node.children.map(translate).join(node.op === 'and' ? ' AND ' : ' OR ')})` : 'TRUE';
      const key = bind(node.key);
      if (node.op === 'exists') return `((metadata ? ${key}) = ${bind(node.value)})`;
      const field = `(metadata -> ${key})`;
      if (node.op === 'in' || node.op === 'nin') {
        const alternatives = node.value.map(value => `${field} = ${bind(JSON.stringify(value))}::jsonb`);
        const expression = alternatives.length ? `(${alternatives.join(' OR ')})` : 'FALSE';
        return node.op === 'nin' ? `(NOT COALESCE(${expression}, FALSE))` : expression;
      }
      return `${field} ${node.op === 'ne' ? 'IS DISTINCT FROM' : '='} ${bind(JSON.stringify(node.value))}::jsonb`;
    };
    const condition = translate(contract.filterTree(filter));
    const sql = `SELECT id, metadata, 1 - (embedding <=> $1::vector) AS score FROM "${this.table}" WHERE namespace = $2 AND ${condition} ORDER BY embedding <=> $1::vector LIMIT ${bind(contract.limit(topK))}`;
    const result = await contract.invoke(() => this.client.query(sql, params), { timeoutMs: this.timeoutMs });
    if (!Array.isArray(result?.rows) || result.rows.length > topK || result.rows.some(row => typeof row.id !== 'string' ||
        !['number', 'string'].includes(typeof row.score) || row.score === '' || !Number.isFinite(Number(row.score)))) {
      throw new Error('Invalid pgvector query result.');
    }
    return { matches: result.rows.map(row => ({ id: row.id, score: Number(row.score), metadata: contract.metadata(row.metadata) })) };
  }
  async delete({ ids, namespace = '' }) {
    contract.ids(ids); const ns = contract.namespace(namespace);
    if (!ids.length) return;
    await contract.invoke(() => this.client.query(`DELETE FROM "${this.table}" WHERE namespace = $1 AND id = ANY($2::text[])`, [ns, ids]),
      { timeoutMs: this.timeoutMs, write: true });
  }
  async deleteAll({ namespace = '' } = {}) {
    const ns = contract.namespace(namespace);
    await contract.invoke(() => this.client.query(`DELETE FROM "${this.table}" WHERE namespace = $1`, [ns]), { timeoutMs: this.timeoutMs, write: true });
  }
}
module.exports = { PgVectorStore };
