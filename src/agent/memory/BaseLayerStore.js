class BaseLayerStore {
  async get(_key) {
    throw new Error('BaseLayerStore.get() must be implemented by subclasses.');
  }

  async set(_key, _value) {
    throw new Error('BaseLayerStore.set() must be implemented by subclasses.');
  }

  async delete(_key) {
    throw new Error('BaseLayerStore.delete() must be implemented by subclasses.');
  }

  async entries() {
    throw new Error('BaseLayerStore.entries() must be implemented by subclasses.');
  }

  async clear() {
    throw new Error('BaseLayerStore.clear() must be implemented by subclasses.');
  }

  static assert(store, name = 'layerStore') {
    if (!store || typeof store !== 'object') {
      throw new Error(`${name} must be an object implementing get(), set(), delete(), entries(), and clear().`);
    }

    for (const method of ['get', 'set', 'delete', 'entries', 'clear']) {
      if (typeof store[method] !== 'function') {
        throw new Error(`${name} must implement ${method}().`);
      }
    }

    return store;
  }
}

module.exports = { BaseLayerStore };
