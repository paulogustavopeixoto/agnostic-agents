const { BaseJobStore } = require('./BaseJobStore');

class InMemoryJobStore extends BaseJobStore {
  constructor() {
    super();
    this.jobs = new Map();
  }

  async saveJob(job) {
    this.jobs.set(job.id, JSON.parse(JSON.stringify(job)));
    return JSON.parse(JSON.stringify(this.jobs.get(job.id)));
  }

  async getJob(jobId) {
    const job = this.jobs.get(jobId);
    return job ? JSON.parse(JSON.stringify(job)) : null;
  }

  async claimJob(jobId, expectedRunAt) {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'scheduled' || job.runAt !== expectedRunAt) return null;
    const claimed = { ...job, status: 'running' };
    this.jobs.set(jobId, JSON.parse(JSON.stringify(claimed)));
    return JSON.parse(JSON.stringify(claimed));
  }

  async listJobs() {
    return [...this.jobs.values()].map(job => JSON.parse(JSON.stringify(job)));
  }
}

module.exports = { InMemoryJobStore };
