const { BaseRunStore } = require('./stores/BaseRunStore');
const { BaseJobStore } = require('./stores/BaseJobStore');
const { BaseLayerStore } = require('../agent/memory/BaseLayerStore');

class StorageBackendRegistry {
  constructor({ runStores = {}, jobStores = {}, layerStores = {} } = {}) {
    this.runStores = new Map();
    this.jobStores = new Map();
    this.layerStores = new Map();

    for (const [name, store] of Object.entries(runStores)) {
      this.registerRunStore(name, store);
    }

    for (const [name, store] of Object.entries(jobStores)) {
      this.registerJobStore(name, store);
    }

    for (const [name, store] of Object.entries(layerStores)) {
      this.registerLayerStore(name, store);
    }
  }

  registerRunStore(name, store) {
    this.runStores.set(this._normalizeName(name, 'run store'), BaseRunStore.assert(store, `runStore "${name}"`));
    return store;
  }

  registerJobStore(name, store) {
    this.jobStores.set(this._normalizeName(name, 'job store'), BaseJobStore.assert(store, `jobStore "${name}"`));
    return store;
  }

  registerLayerStore(name, store) {
    this.layerStores.set(
      this._normalizeName(name, 'layer store'),
      BaseLayerStore.assert(store, `layerStore "${name}"`)
    );
    return store;
  }

  getRunStore(name) {
    return this.runStores.get(name) || null;
  }

  getJobStore(name) {
    return this.jobStores.get(name) || null;
  }

  getLayerStore(name) {
    return this.layerStores.get(name) || null;
  }

  list() {
    return {
      runStores: [...this.runStores.keys()],
      jobStores: [...this.jobStores.keys()],
      layerStores: [...this.layerStores.keys()],
    };
  }

  _normalizeName(name, label) {
    if (!name || typeof name !== 'string') {
      throw new Error(`Storage backend registry ${label} names must be non-empty strings.`);
    }

    return name;
  }
}

module.exports = { StorageBackendRegistry };
