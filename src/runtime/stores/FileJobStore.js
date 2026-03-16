const fs = require('fs/promises');
const path = require('path');

class FileJobStore {
  constructor({ directory = path.join(process.cwd(), '.agnostic-agents', 'jobs') } = {}) {
    this.directory = directory;
  }

  async saveJob(job) {
    await fs.mkdir(this.directory, { recursive: true });
    await fs.writeFile(
      path.join(this.directory, `${job.id}.json`),
      JSON.stringify(job, null, 2),
      'utf8'
    );
    return JSON.parse(JSON.stringify(job));
  }

  async getJob(jobId) {
    try {
      const payload = await fs.readFile(path.join(this.directory, `${jobId}.json`), 'utf8');
      return JSON.parse(payload);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  async listJobs() {
    try {
      await fs.mkdir(this.directory, { recursive: true });
      const entries = await fs.readdir(this.directory);
      const jobs = await Promise.all(
        entries
          .filter(entry => entry.endsWith('.json'))
          .map(async entry =>
            JSON.parse(await fs.readFile(path.join(this.directory, entry), 'utf8'))
          )
      );
      return jobs;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }

      throw error;
    }
  }
}

module.exports = { FileJobStore };
