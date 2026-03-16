const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const {
  Run,
  BaseRunStore,
  BaseJobStore,
  BaseLayerStore,
  StorageBackendRegistry,
} = require('../index');

async function writeJsonAtomic(filePath, payload) {
  const tempPath = `${filePath}.tmp`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tempPath, JSON.stringify(payload, null, 2), 'utf8');
  await fs.rename(tempPath, filePath);
}

class DurableRunStore extends BaseRunStore {
  constructor({ directory }) {
    super();
    this.directory = directory;
  }

  async saveRun(run) {
    const record = run instanceof Run ? run.toJSON() : run;
    await writeJsonAtomic(path.join(this.directory, `${record.id}.json`), record);
    return run instanceof Run ? run : Run.fromJSON(record);
  }

  async getRun(runId) {
    try {
      const raw = await fs.readFile(path.join(this.directory, `${runId}.json`), 'utf8');
      return Run.fromJSON(JSON.parse(raw));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async listRuns() {
    try {
      const entries = await fs.readdir(this.directory);
      const runs = [];
      for (const entry of entries.filter(name => name.endsWith('.json'))) {
        const raw = await fs.readFile(path.join(this.directory, entry), 'utf8');
        runs.push(Run.fromJSON(JSON.parse(raw)));
      }
      return runs;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}

class DurableJobStore extends BaseJobStore {
  constructor({ filePath }) {
    super();
    this.filePath = filePath;
  }

  async _readAll() {
    try {
      return JSON.parse(await fs.readFile(this.filePath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async _writeAll(jobs) {
    await writeJsonAtomic(this.filePath, jobs);
  }

  async saveJob(job) {
    const jobs = await this._readAll();
    const index = jobs.findIndex(entry => entry.id === job.id);
    if (index >= 0) {
      jobs[index] = job;
    } else {
      jobs.push(job);
    }
    await this._writeAll(jobs);
    return job;
  }

  async getJob(jobId) {
    const jobs = await this._readAll();
    return jobs.find(job => job.id === jobId) || null;
  }

  async listJobs() {
    return this._readAll();
  }
}

class DurableLayerStore extends BaseLayerStore {
  constructor({ filePath }) {
    super();
    this.filePath = filePath;
  }

  async _readMap() {
    try {
      return JSON.parse(await fs.readFile(this.filePath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }

  async _writeMap(value) {
    await writeJsonAtomic(this.filePath, value);
  }

  async get(key) {
    const map = await this._readMap();
    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
  }

  async set(key, value) {
    const map = await this._readMap();
    map[key] = value;
    await this._writeMap(map);
    return value;
  }

  async delete(key) {
    const map = await this._readMap();
    delete map[key];
    await this._writeMap(map);
  }

  async entries() {
    const map = await this._readMap();
    return Object.entries(map);
  }

  async clear() {
    await this._writeMap({});
  }
}

async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'agnostic-durable-backends-'));
  const registry = new StorageBackendRegistry();

  registry.registerRunStore('durable', new DurableRunStore({ directory: path.join(directory, 'runs') }));
  registry.registerJobStore('durable', new DurableJobStore({ filePath: path.join(directory, 'jobs.json') }));
  registry.registerLayerStore('durable', new DurableLayerStore({ filePath: path.join(directory, 'memory.json') }));

  const runStore = registry.getRunStore('durable');
  const jobStore = registry.getJobStore('durable');
  const layerStore = registry.getLayerStore('durable');

  const run = new Run({ input: 'durable example' });
  run.setStatus('completed');
  run.output = 'ok';
  await runStore.saveRun(run);
  await jobStore.saveJob({ id: 'job-1', handler: 'sync', status: 'scheduled' });
  await layerStore.set('current_project', 'runtime maturity');

  console.dir(
    {
      runs: await runStore.listRuns(),
      jobs: await jobStore.listJobs(),
      memory: await layerStore.entries(),
    },
    { depth: null }
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
