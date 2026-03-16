class BaseJobStore {
  async saveJob(_job) {
    throw new Error('BaseJobStore.saveJob() must be implemented by subclasses.');
  }

  async getJob(_jobId) {
    throw new Error('BaseJobStore.getJob() must be implemented by subclasses.');
  }

  async listJobs() {
    throw new Error('BaseJobStore.listJobs() must be implemented by subclasses.');
  }

  static assert(store, name = 'jobStore') {
    if (!store || typeof store !== 'object') {
      throw new Error(`${name} must be an object implementing saveJob(), getJob(), and listJobs().`);
    }

    for (const method of ['saveJob', 'getJob', 'listJobs']) {
      if (typeof store[method] !== 'function') {
        throw new Error(`${name} must implement ${method}().`);
      }
    }

    return store;
  }
}

module.exports = { BaseJobStore };
