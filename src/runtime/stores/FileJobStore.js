const fs = require('fs/promises');
const path = require('path');
const { BaseJobStore } = require('./BaseJobStore');
const { recordPath, readJson, writeJson } = require('./PrivateJsonFile');
const { FileRunLock } = require('../RunLock');

class FileJobStore extends BaseJobStore {
  constructor({ directory = path.join(process.cwd(), '.agnostic-agents', 'jobs') } = {}) {
    super();
    this.directory = directory;
    this.runLock = new FileRunLock({ directory: path.join(path.resolve(directory), '.claims') });
  }

  async saveJob(job) {
    await writeJson(recordPath(this.directory, job.id), job);
    return JSON.parse(JSON.stringify(job));
  }

  async getJob(jobId) {
    const filePath = recordPath(this.directory, jobId);
    try {
      return await readJson(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  async claimJob(jobId, expectedRunAt) {
    recordPath(this.directory, jobId);
    try {
      return await this.runLock.withLock(jobId, async () => {
        const job = await this.getJob(jobId);
        if (!job || job.status !== 'scheduled' || job.runAt !== expectedRunAt) return null;
        job.status = 'running';
        await this.saveJob(job);
        return job;
      });
    } catch (error) {
      if (error.name === 'ToolPolicyError') return null;
      throw error;
    }
  }

  async listJobs() {
    try {
      await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
      const entries = await fs.readdir(this.directory);
      const jobs = await Promise.all(
        entries
          .filter(entry => entry.endsWith('.json'))
          .map(entry => this.getJob(entry.slice(0, -5)))
      );
      return jobs.filter(Boolean);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }

      throw error;
    }
  }
}

module.exports = { FileJobStore };
