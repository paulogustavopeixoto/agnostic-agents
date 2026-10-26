const { BaseRunStore } = require('./BaseRunStore');
const { Run } = require('../Run');

/** Logical run-store namespace. The backing store remains privileged host infrastructure. */
class ScopedRunStore extends BaseRunStore {
  constructor({ store, tenantId } = {}) {
    super();
    BaseRunStore.assert(store);
    if (typeof tenantId !== 'string' || !tenantId.trim()) throw new TypeError('tenantId is required.');
    this.store = store;
    this.runLock = store.runLock;
    const encoded = Buffer.from(tenantId).toString('base64url');
    this.prefix = `tenant-${encoded.length}-${encoded}-`;
  }

  _id(id) {
    if (typeof id !== 'string' || !id) throw new TypeError('Run ID is required.');
    return this.prefix + Buffer.from(id).toString('base64url');
  }

  _decode(run) {
    if (!run || !run.id.startsWith(this.prefix)) return null;
    const data = run.toJSON ? run.toJSON() : run;
    const id = Buffer.from(data.id.slice(this.prefix.length), 'base64url').toString();
    return Run.fromJSON({ ...data, id });
  }

  async saveRun(run) {
    const data = run.toJSON ? run.toJSON() : run;
    await this.store.saveRun(Run.fromJSON({ ...data, id: this._id(data.id) }));
    return this.getRun(data.id);
  }

  async getRun(id) { return this._decode(await this.store.getRun(this._id(id))); }

  async listRuns() {
    return (await this.store.listRuns()).map(run => this._decode(run)).filter(Boolean);
  }
}

module.exports = { ScopedRunStore };
