const { Run } = require('../Run');

class InMemoryRunStore {
  constructor() {
    this.runs = new Map();
  }

  async saveRun(run) {
    const storedRun = run instanceof Run ? run : Run.fromJSON(run);
    this.runs.set(storedRun.id, storedRun.toJSON());
    return Run.fromJSON(this.runs.get(storedRun.id));
  }

  async getRun(runId) {
    const data = this.runs.get(runId);
    return data ? Run.fromJSON(data) : null;
  }

  async listRuns() {
    return [...this.runs.values()].map(run => Run.fromJSON(run));
  }
}

module.exports = { InMemoryRunStore };
