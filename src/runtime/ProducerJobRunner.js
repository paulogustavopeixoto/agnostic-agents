const { Run } = require('./Run');
const { normalizeContent } = require('./ProducerRuntime');
const { defaultRunLock } = require('./RunLock');
const { invokeWithDeadline } = require('./InvocationControl');

/** Remote jobs are started once; only polling is resumed after a restart. */
class ProducerJobRunner {
  constructor({ backend, runStore, authorize, maxPolls = 20, pollIntervalMs = 1000,
    runLock = defaultRunLock, lockNamespace = 'producer-job', invocationTimeoutMs = 60000 } = {}) {
    if (typeof backend?.start !== 'function' || typeof backend?.poll !== 'function' ||
        (backend.id !== undefined && (typeof backend.id !== 'string' || !backend.id.trim())) ||
        typeof runStore?.saveRun !== 'function' || typeof runStore?.getRun !== 'function' ||
        typeof authorize !== 'function' || !Number.isSafeInteger(maxPolls) || maxPolls < 1 ||
        !Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < 0 || pollIntervalMs > 60000 ||
        typeof runLock?.withLock !== 'function' || typeof lockNamespace !== 'string' ||
        !Number.isSafeInteger(invocationTimeoutMs) || invocationTimeoutMs < 1 || invocationTimeoutMs > 2147483647) {
      throw new TypeError('Invalid producer job runner.');
    }
    Object.assign(this, { backend, runStore, authorize, maxPolls, pollIntervalMs });
    Object.assign(this, { runLock, lockNamespace, invocationTimeoutMs });
    this.backendId = typeof backend.id === 'string' ? backend.id : null;
  }

  async start({ operation, content }, { signal } = {}) {
    if (typeof operation !== 'string' || !operation) throw new TypeError('Operation is required.');
    const request = { operation, content: normalizeContent(content) };
    signal?.throwIfAborted();
    if (await this.authorize({ action: 'start', request }) !== true) throw new Error('Job start denied.');
    const run = new Run({ input: request, metadata: { remoteJob: true, contentVersion: '1.0', remoteBackendId: this.backendId } });
    run.setStatus('running');
    run.state.remoteJob = { status: 'starting', idempotencyKey: run.id };
    await this.runStore.saveRun(run);
    try {
      signal?.throwIfAborted();
      const result = await invokeWithDeadline(controlSignal => this.backend.start(request,
        { runId: run.id, idempotencyKey: run.id, signal: controlSignal }), { signal, timeoutMs: this.invocationTimeoutMs });
      if (typeof result?.jobId !== 'string' || !result.jobId.trim()) throw new Error('Missing job ID.');
      run.state.remoteJob = { ...run.state.remoteJob, jobId: result.jobId, status: 'pending', polls: 0 };
      run.setStatus('paused');
      run.pendingPause = { stage: 'remote_job', reason: 'Awaiting remote job.' };
      await this.runStore.saveRun(run);
      return run;
    } catch {
      // The remote service may have accepted work even when no response was saved.
      run.state.remoteJob.status = 'uncertain';
      run.setStatus('paused');
      run.pendingPause = { stage: 'remote_job_uncertain', reason: 'Reconcile remote state before retrying.' };
      await this.runStore.saveRun(run);
      return run;
    }
  }

  async resume(runId, { signal } = {}) {
    return this.runLock.withLock(JSON.stringify([this.lockNamespace, this.runStore.prefix || '', runId]),
      () => this._resume(runId, { signal }));
  }

  async _resume(runId, { signal } = {}) {
    signal?.throwIfAborted();
    // Authorize the ID before loading possibly sensitive execution state.
    if (await this.authorize({ action: 'poll', runId }) !== true) throw new Error('Job access denied.');
    const stored = await this.runStore.getRun(runId);
    if (!stored) throw new Error('Job run unavailable.');
    const run = stored instanceof Run ? stored : Run.fromJSON(stored);
    if (!run.metadata.remoteJob) throw new Error('Not a remote job run.');
    if ((run.metadata.remoteBackendId || null) !== this.backendId) throw new Error('Remote job backend binding mismatch.');
    if (['completed', 'failed', 'cancelled'].includes(run.status)) return run;
    const job = run.state.remoteJob;
    if (!job?.jobId || job.status === 'uncertain') throw new Error('Remote state requires reconciliation.');
    for (let attempt = 0; attempt < this.maxPolls; attempt++) {
      signal?.throwIfAborted();
      const result = await invokeWithDeadline(controlSignal => this.backend.poll(job.jobId, { runId, signal: controlSignal }),
        { signal, timeoutMs: this.invocationTimeoutMs });
      signal?.throwIfAborted();
      job.polls = (job.polls || 0) + 1;
      if (!['pending', 'completed', 'failed'].includes(result?.status)) throw new Error('Invalid job status.');
      job.status = result.status;
      if (result.status === 'completed') {
        run.output = { content: normalizeContent(result.content) };
        run.pendingPause = null;
        run.setStatus('completed');
      } else if (result.status === 'failed') {
        run.pendingPause = null;
        run.setStatus('failed');
        run.addError({ name: 'ProducerError', message: 'Remote job failed.' });
      }
      run.addEvent({ type: 'remote_job_polled', timestamp: new Date().toISOString(), status: job.status });
      await this.runStore.saveRun(run);
      if (result.status !== 'pending') return run;
      if (attempt + 1 < this.maxPolls && this.pollIntervalMs) {
        await new Promise((resolve, reject) => {
          const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(new Error('Job polling cancelled.')); };
          const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, this.pollIntervalMs);
          signal?.addEventListener('abort', abort, { once: true });
          if (signal?.aborted) abort();
        });
      }
    }
    return run;
  }
}

module.exports = { ProducerJobRunner };
