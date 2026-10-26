const { Run } = require('../Run');
const { BaseRunStore } = require('./BaseRunStore');

class InMemoryRunStore extends BaseRunStore {
  constructor() {
    super();
    this.runs = new Map();
  }

  async saveRun(run) {
    const storedRun = run instanceof Run ? run : Run.fromJSON(run);
    this.runs.set(storedRun.id, JSON.parse(JSON.stringify(storedRun.toJSON())));
    return this.getRun(storedRun.id);
  }

  async getRun(runId) {
    const data = this.runs.get(runId);
    return data ? Run.fromJSON(JSON.parse(JSON.stringify(data))) : null;
  }

  async listRuns() {
    return [...this.runs.values()].map(run => Run.fromJSON(JSON.parse(JSON.stringify(run))));
  }
}

module.exports = { InMemoryRunStore };
