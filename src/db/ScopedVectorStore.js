const { ToolPolicyError } = require('../errors');

class ScopedVectorStore {
  constructor({ store, tenantId, authorize } = {}) {
    if (!store?.capabilities?.namespaceIsolation || typeof store.query !== 'function' ||
        typeof store.upsert !== 'function' || typeof tenantId !== 'string' || !tenantId ||
        typeof authorize !== 'function') throw new TypeError('A namespace-isolating vector backend is required.');
    Object.assign(this, { store, tenantId, authorize });
    this.capabilities = { namespaceIsolation: true };
  }

  async _allow(operation) {
    if (await this.authorize({ operation, tenantId: this.tenantId }) !== true) {
      throw new ToolPolicyError('Vector memory access denied.');
    }
  }

  async upsert(options) {
    await this._allow('write');
    return this.store.upsert({ ...options, namespace: this.tenantId,
      vectors: options.vectors.map(vector => ({ ...vector, metadata: { ...vector.metadata, tenantId: this.tenantId } })) });
  }

  async query(options) {
    await this._allow('read');
    const result = await this.store.query({ ...options, namespace: this.tenantId,
      filter: { $and: [options.filter || {}, { tenantId: { $eq: this.tenantId } }] } });
    if (!Array.isArray(result?.matches) || result.matches.some(match => match.metadata?.tenantId !== this.tenantId)) {
      throw new ToolPolicyError('Vector memory scope violation.');
    }
    return { matches: result.matches };
  }

  async delete(options) { await this._allow('delete'); return this.store.delete({ ...options, namespace: this.tenantId }); }
  async deleteAll(options = {}) { await this._allow('delete'); return this.store.deleteAll({ ...options, namespace: this.tenantId }); }
}

module.exports = { ScopedVectorStore };
