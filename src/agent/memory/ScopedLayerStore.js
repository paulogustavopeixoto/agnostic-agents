const { BaseLayerStore } = require('./BaseLayerStore');

/** Namespaces a memory store for a host-authenticated tenant. */
class ScopedLayerStore extends BaseLayerStore {
  constructor({ store, tenantId } = {}) {
    super();
    BaseLayerStore.assert(store);
    if (typeof tenantId !== 'string' || !tenantId.trim()) throw new TypeError('tenantId is required.');
    this.store = store;
    this.prefix = `${JSON.stringify(tenantId)}:`;
  }

  _key(key) {
    if (typeof key !== 'string') throw new TypeError('Memory keys must be strings.');
    return this.prefix + key;
  }
  async get(key) { return this.store.get(this._key(key)); }
  async set(key, value) { return this.store.set(this._key(key), value); }
  async delete(key) { return this.store.delete(this._key(key)); }
  async entries() {
    return (await this.store.entries()).filter(([key]) => key.startsWith(this.prefix))
      .map(([key, value]) => [key.slice(this.prefix.length), value]);
  }
  async clear() {
    for (const [key] of await this.entries()) await this.delete(key);
  }
}

module.exports = { ScopedLayerStore };
