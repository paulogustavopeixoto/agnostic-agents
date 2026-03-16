class InMemoryJobStore {
  constructor() {
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

  async listJobs() {
    return [...this.jobs.values()].map(job => JSON.parse(JSON.stringify(job)));
  }
}

module.exports = { InMemoryJobStore };
