const { BaseLayerStore } = require('./BaseLayerStore');

class InMemoryLayerStore extends BaseLayerStore {
  constructor({ initial = {} } = {}) {
    super();
    this.records = Object.assign(Object.create(null), initial);
  }

  async get(key) {
    return Object.hasOwn(this.records, key) ? this.records[key] : null;
  }

  async set(key, value) {
    this.records[key] = value;
    return value;
  }

  async delete(key) {
    delete this.records[key];
  }

  async entries() {
    return Object.entries(this.records);
  }

  async clear() {
    this.records = Object.create(null);
  }
}

module.exports = { InMemoryLayerStore };
