class InMemoryLayerStore {
  constructor({ initial = {} } = {}) {
    this.records = { ...initial };
  }

  async get(key) {
    return this.records[key] || null;
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
    this.records = {};
  }
}

module.exports = { InMemoryLayerStore };
