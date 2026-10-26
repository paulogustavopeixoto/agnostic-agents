const fs = require('fs/promises');
const path = require('path');
const { Run } = require('../Run');
const { BaseRunStore } = require('./BaseRunStore');
const { recordPath, readJson, writeJson } = require('./PrivateJsonFile');
const { FileRunLock } = require('../RunLock');

class FileRunStore extends BaseRunStore {
  constructor({ directory = path.join(process.cwd(), '.agnostic-agents', 'runs') } = {}) {
    super();
    this.directory = directory;
    this.runLock = new FileRunLock({ directory: path.join(path.resolve(directory), '.owners') });
  }

  _path(runId) {
    try { return recordPath(this.directory, runId); }
    catch { throw new Error('Invalid run ID.'); }
  }

  async saveRun(run) {
    const storedRun = run instanceof Run ? run : Run.fromJSON(run);
    await writeJson(this._path(storedRun.id), storedRun.toJSON());
    return storedRun;
  }

  async getRun(runId) {
    const filePath = this._path(runId);
    try {
      return Run.fromJSON(await readJson(filePath));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  async listRuns() {
    try {
      await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
      const entries = await fs.readdir(this.directory);
      const runs = await Promise.all(
        entries
          .filter(entry => entry.endsWith('.json'))
          .map(entry => this.getRun(entry.slice(0, -5)))
      );
      return runs.filter(Boolean);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }

      throw error;
    }
  }
}

module.exports = { FileRunStore };
