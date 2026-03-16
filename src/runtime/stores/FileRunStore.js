const fs = require('fs/promises');
const path = require('path');
const { Run } = require('../Run');

class FileRunStore {
  constructor({ directory = path.join(process.cwd(), '.agnostic-agents', 'runs') } = {}) {
    this.directory = directory;
  }

  async saveRun(run) {
    const storedRun = run instanceof Run ? run : Run.fromJSON(run);
    await fs.mkdir(this.directory, { recursive: true });
    await fs.writeFile(
      path.join(this.directory, `${storedRun.id}.json`),
      JSON.stringify(storedRun.toJSON(), null, 2),
      'utf8'
    );
    return storedRun;
  }

  async getRun(runId) {
    try {
      const payload = await fs.readFile(path.join(this.directory, `${runId}.json`), 'utf8');
      return Run.fromJSON(JSON.parse(payload));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }
}

module.exports = { FileRunStore };
