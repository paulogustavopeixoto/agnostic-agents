const { InMemoryJobStore } = require('./stores/InMemoryJobStore');

class BackgroundJobScheduler {
  constructor({ store = new InMemoryJobStore(), handlers = {} } = {}) {
    this.store = store;
    this.handlers = new Map();

    for (const [name, handler] of Object.entries(handlers)) {
      this.registerHandler(name, handler);
    }
  }

  registerHandler(name, handler) {
    if (!name || typeof handler !== 'function') {
      throw new Error('Background job handlers require a name and function.');
    }

    this.handlers.set(name, handler);
    return handler;
  }

  _normalizeJob(job) {
    if (!job?.id) {
      throw new Error('Background jobs require an id.');
    }

    const handlerName = job.handler || null;
    const inlineHandler = typeof job.run === 'function' ? job.run : null;
    if (!handlerName && !inlineHandler) {
      throw new Error('Background jobs require either a handler name or run function.');
    }

    if (handlerName && !this.handlers.has(handlerName) && !inlineHandler) {
      throw new Error(`Background job handler "${handlerName}" is not registered.`);
    }

    const resolvedHandlerName = handlerName || `inline:${job.id}`;
    if (inlineHandler) {
      this.handlers.set(resolvedHandlerName, inlineHandler);
    }

    return {
      id: job.id,
      handler: resolvedHandlerName,
      runAt: job.runAt ? new Date(job.runAt).toISOString() : new Date().toISOString(),
      intervalMs: Number.isFinite(job.intervalMs) ? job.intervalMs : null,
      maxRuns: Number.isFinite(job.maxRuns) ? job.maxRuns : null,
      runCount: Number.isFinite(job.runCount) ? job.runCount : 0,
      status: job.status || 'scheduled',
      metadata: { ...(job.metadata || {}) },
      payload: job.payload ? JSON.parse(JSON.stringify(job.payload)) : {},
      result: job.result ?? null,
      error: job.error ?? null,
      lastRunAt: job.lastRunAt || null,
      history: [...(job.history || [])],
    };
  }

  async schedule(job) {
    const normalized = this._normalizeJob(job);
    await this.store.saveJob(normalized);
    return normalized;
  }

  async get(jobId) {
    return this.store.getJob(jobId);
  }

  async runDueJobs(now = new Date()) {
    const currentTime = new Date(now).getTime();
    const jobs = await this.store.listJobs();
    const results = [];

    for (const job of jobs) {
      if (job.status !== 'scheduled') {
        continue;
      }

      if (new Date(job.runAt).getTime() > currentTime) {
        continue;
      }

      const handler = this.handlers.get(job.handler);
      if (typeof handler !== 'function') {
        job.status = 'failed';
        job.error = `Background job handler "${job.handler}" is not registered.`;
        await this.store.saveJob(job);
        results.push({ ...job });
        continue;
      }

      try {
        job.status = 'running';
        await this.store.saveJob(job);

        const result = await handler(job.payload || {}, job);
        job.runCount += 1;
        job.result = result;
        job.error = null;
        job.lastRunAt = new Date(currentTime).toISOString();
        job.history.push({
          runNumber: job.runCount,
          status: 'completed',
          runAt: job.lastRunAt,
          result,
        });

        if (job.intervalMs && (job.maxRuns === null || job.runCount < job.maxRuns)) {
          job.status = 'scheduled';
          job.runAt = new Date(currentTime + job.intervalMs).toISOString();
        } else {
          job.status = 'completed';
        }
      } catch (error) {
        job.runCount += 1;
        job.status = 'failed';
        job.error = error.message || String(error);
        job.lastRunAt = new Date(currentTime).toISOString();
        job.history.push({
          runNumber: job.runCount,
          status: 'failed',
          runAt: job.lastRunAt,
          error: job.error,
        });
      }

      await this.store.saveJob(job);
      results.push({ ...job });
    }

    return results;
  }

  async list() {
    return this.store.listJobs();
  }
}

module.exports = { BackgroundJobScheduler };
