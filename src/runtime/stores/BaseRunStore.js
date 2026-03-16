class BaseRunStore {
  async saveRun(_run) {
    throw new Error('BaseRunStore.saveRun() must be implemented by subclasses.');
  }

  async getRun(_runId) {
    throw new Error('BaseRunStore.getRun() must be implemented by subclasses.');
  }

  async listRuns() {
    throw new Error('BaseRunStore.listRuns() must be implemented by subclasses.');
  }

  static assert(store, name = 'runStore') {
    if (!store || typeof store !== 'object') {
      throw new Error(`${name} must be an object implementing saveRun(), getRun(), and listRuns().`);
    }

    for (const method of ['saveRun', 'getRun', 'listRuns']) {
      if (typeof store[method] !== 'function') {
        throw new Error(`${name} must implement ${method}().`);
      }
    }

    return store;
  }
}

module.exports = { BaseRunStore };
