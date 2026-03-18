const { StateBundle } = require('./StateBundle');

class StateConsistencyChecker {
  check(bundle) {
    const stateBundle = bundle instanceof StateBundle ? bundle : StateBundle.fromJSON(bundle || {});
    const run = stateBundle.run;
    const memory = stateBundle.memory || {};
    const metadata = stateBundle.metadata || {};
    const errors = [];
    const warnings = [];

    const workingMemory = memory.working || {};
    const semanticMemory = memory.semantic || {};
    const jobs = this._normalizeJobs(metadata.jobs, warnings);
    const referencedJobIds = this._collectReferencedJobIds(run);
    const resolvedJobs = referencedJobIds
      .map(jobId => jobs.find(job => job.id === jobId))
      .filter(Boolean);

    if ((run?.status === 'running' || run?.status === 'paused' || run?.status === 'waiting_for_approval') &&
      Object.keys(workingMemory).length === 0) {
      warnings.push('Run is active but the portable state bundle has no working-memory context.');
    }

    if (run?.state?.recovery?.required && !semanticMemory.last_incident) {
      warnings.push('Run requires recovery but semantic memory does not record the last incident context.');
    }

    if (workingMemory.active_task && typeof run?.input === 'string' && run.input) {
      const normalizedInput = run.input.toLowerCase();
      const normalizedTask = String(workingMemory.active_task).toLowerCase();
      if (!normalizedInput.includes(normalizedTask) && !normalizedTask.includes(normalizedInput)) {
        warnings.push('working.active_task does not appear to align with the current run input.');
      }
    }

    for (const jobId of referencedJobIds) {
      if (!jobs.some(job => job.id === jobId)) {
        errors.push(`Referenced job "${jobId}" is missing from bundle metadata.jobs.`);
      }
    }

    for (const job of jobs) {
      if (job.runId && run?.id && job.runId !== run.id) {
        warnings.push(`Job "${job.id}" references run "${job.runId}" instead of "${run.id}".`);
      }
    }

    if (resolvedJobs.some(job => job.status === 'failed') && run?.status === 'completed') {
      warnings.push('Run is completed but a referenced background job is marked failed.');
    }

    if (resolvedJobs.some(job => job.status === 'completed') && run?.status === 'failed') {
      warnings.push('Run is failed but a referenced background job is marked completed.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        runId: run?.id || null,
        runStatus: run?.status || null,
        memoryLayers: Object.keys(memory),
        referencedJobIds,
        resolvedJobIds: resolvedJobs.map(job => job.id),
      },
    };
  }

  _normalizeJobs(jobs, warnings) {
    if (jobs == null) {
      return [];
    }

    if (!Array.isArray(jobs)) {
      warnings.push('bundle metadata.jobs should be an array when provided.');
      return [];
    }

    const seen = new Set();
    const normalized = [];

    for (const entry of jobs) {
      if (!entry || typeof entry !== 'object') {
        warnings.push('bundle metadata.jobs contains a non-object entry.');
        continue;
      }

      if (!entry.id) {
        warnings.push('bundle metadata.jobs contains an entry without an id.');
        continue;
      }

      if (seen.has(entry.id)) {
        warnings.push(`bundle metadata.jobs contains duplicate job id "${entry.id}".`);
        continue;
      }

      seen.add(entry.id);
      normalized.push(JSON.parse(JSON.stringify(entry)));
    }

    return normalized;
  }

  _collectReferencedJobIds(run) {
    const candidates = [
      run?.metadata?.jobId,
      run?.metadata?.scheduler?.jobId,
      run?.state?.jobId,
      run?.state?.scheduler?.jobId,
      run?.pendingPause?.jobId,
    ];

    return [...new Set(candidates.filter(Boolean))];
  }
}

module.exports = { StateConsistencyChecker };
