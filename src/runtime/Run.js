const { randomUUID } = require('crypto');

class Run {
  constructor({
    id = randomUUID(),
    input = '',
    state = {},
    messages = [],
    steps = [],
    toolCalls = [],
    toolResults = [],
    checkpoints = [],
    errors = [],
    events = [],
    timestamps = {},
    status = 'pending',
    output = null,
    pendingApproval = null,
    pendingPause = null,
    metrics = {},
    metadata = {},
  } = {}) {
    this.id = id;
    this.input = input;
    this.state = { ...state };
    this.messages = [...messages];
    this.steps = [...steps];
    this.toolCalls = [...toolCalls];
    this.toolResults = [...toolResults];
    this.checkpoints = [...checkpoints];
    this.errors = [...errors];
    this.events = [...events];
    this.timestamps = {
      createdAt: timestamps.createdAt || new Date().toISOString(),
      startedAt: timestamps.startedAt || null,
      updatedAt: timestamps.updatedAt || new Date().toISOString(),
      completedAt: timestamps.completedAt || null,
      failedAt: timestamps.failedAt || null,
      cancelledAt: timestamps.cancelledAt || null,
    };
    this.status = status;
    this.output = output;
    this.pendingApproval = pendingApproval;
    this.pendingPause = pendingPause;
    this.metrics = {
      tokenUsage: {
        prompt: metrics.tokenUsage?.prompt || 0,
        completion: metrics.tokenUsage?.completion || 0,
        total: metrics.tokenUsage?.total || 0,
      },
      cost: metrics.cost || 0,
      timings: {
        retrievalMs: metrics.timings?.retrievalMs || 0,
        modelMs: metrics.timings?.modelMs || 0,
        toolMs: metrics.timings?.toolMs || 0,
        workflowMs: metrics.timings?.workflowMs || 0,
        verifierMs: metrics.timings?.verifierMs || 0,
      },
      childRuns: {
        count: metrics.childRuns?.count || 0,
        items: [...(metrics.childRuns?.items || [])],
      },
      debug: metrics.debug || {},
    };
    this.metadata = {
      ...metadata,
      lineage: {
        rootRunId: metadata.lineage?.rootRunId || id,
        parentRunId: metadata.lineage?.parentRunId || null,
        childRunIds: [...(metadata.lineage?.childRunIds || [])],
        branchOriginRunId: metadata.lineage?.branchOriginRunId || null,
        branchCheckpointId: metadata.lineage?.branchCheckpointId || null,
      },
    };
  }

  touch() {
    this.timestamps.updatedAt = new Date().toISOString();
  }

  setStatus(status) {
    this.status = status;

    if (status === 'running' && !this.timestamps.startedAt) {
      this.timestamps.startedAt = new Date().toISOString();
    }

    if (status === 'completed') {
      this.timestamps.completedAt = new Date().toISOString();
    }

    if (status === 'failed') {
      this.timestamps.failedAt = new Date().toISOString();
    }

    if (status === 'cancelled') {
      this.timestamps.cancelledAt = new Date().toISOString();
    }

    this.touch();
  }

  addMessage(message) {
    this.messages.push(message);
    this.touch();
  }

  addStep(step) {
    this.steps.push(step);
    this.touch();
    return step;
  }

  updateStep(stepId, patch = {}) {
    const step = this.steps.find(entry => entry.id === stepId);
    if (!step) {
      return null;
    }

    Object.assign(step, patch, { updatedAt: new Date().toISOString() });
    if (
      (patch.status === 'completed' || patch.status === 'failed' || patch.status === 'paused') &&
      step.createdAt
    ) {
      step.durationMs = new Date(step.updatedAt).getTime() - new Date(step.createdAt).getTime();
    }
    this.touch();
    return step;
  }

  recordUsage(usage = {}) {
    const prompt = usage.prompt ?? usage.promptTokens ?? usage.input_tokens ?? 0;
    const completion = usage.completion ?? usage.completionTokens ?? usage.output_tokens ?? 0;
    const total = usage.total ?? usage.totalTokens ?? prompt + completion;
    this.metrics.tokenUsage.prompt += prompt;
    this.metrics.tokenUsage.completion += completion;
    this.metrics.tokenUsage.total += total;
    this.touch();
  }

  recordCost(cost = 0) {
    this.metrics.cost += cost || 0;
    this.touch();
  }

  recordTiming(key, durationMs = 0) {
    if (!this.metrics.timings[key]) {
      this.metrics.timings[key] = 0;
    }
    this.metrics.timings[key] += durationMs || 0;
    this.touch();
  }

  aggregateChildRun(childRun, metadata = {}) {
    const run = childRun instanceof Run ? childRun : Run.fromJSON(childRun || {});
    const existing = this.metrics.childRuns.items.find(item => item.runId === run.id);
    if (existing) {
      return existing;
    }

    const item = {
      runId: run.id,
      status: run.status,
      tokenUsage: { ...(run.metrics?.tokenUsage || { prompt: 0, completion: 0, total: 0 }) },
      cost: run.metrics?.cost || 0,
      timings: { ...(run.metrics?.timings || {}) },
      metadata,
    };

    this.metrics.childRuns.items.push(item);
    this.metrics.childRuns.count = this.metrics.childRuns.items.length;
    this.recordUsage(item.tokenUsage);
    this.recordCost(item.cost);

    for (const [key, value] of Object.entries(item.timings)) {
      if (key === 'workflowMs' && metadata.scope === 'workflow_child') {
        continue;
      }
      this.recordTiming(key, value);
    }

    this.touch();
    return item;
  }

  addToolCall(toolCall) {
    this.toolCalls.push(toolCall);
    this.touch();
  }

  addToolResult(toolResult) {
    this.toolResults.push(toolResult);
    this.touch();
  }

  addError(error) {
    this.errors.push(error);
    this.touch();
  }

  addEvent(event) {
    this.events.push(event);
    this.touch();
  }

  addCheckpoint(checkpoint) {
    this.checkpoints.push(checkpoint);
    this.touch();
    return checkpoint;
  }

  registerChildRun(childRunId) {
    if (!childRunId) {
      return this.metadata.lineage.childRunIds;
    }

    if (!this.metadata.lineage.childRunIds.includes(childRunId)) {
      this.metadata.lineage.childRunIds.push(childRunId);
      this.touch();
    }

    return [...this.metadata.lineage.childRunIds];
  }

  getCheckpoint(checkpointId) {
    if (!checkpointId) {
      return this.checkpoints[this.checkpoints.length - 1] || null;
    }

    return this.checkpoints.find(checkpoint => checkpoint.id === checkpointId) || null;
  }

  createCheckpointSnapshot() {
    return {
      state: JSON.parse(JSON.stringify(this.state)),
      messages: JSON.parse(JSON.stringify(this.messages)),
      steps: JSON.parse(JSON.stringify(this.steps)),
      toolCalls: JSON.parse(JSON.stringify(this.toolCalls)),
      toolResults: JSON.parse(JSON.stringify(this.toolResults)),
      metrics: JSON.parse(JSON.stringify(this.metrics)),
      pendingApproval: this.pendingApproval ? JSON.parse(JSON.stringify(this.pendingApproval)) : null,
      pendingPause: this.pendingPause ? JSON.parse(JSON.stringify(this.pendingPause)) : null,
      output: this.output,
      status: this.status,
    };
  }

  branchFromCheckpoint(checkpointId, { id = randomUUID(), input = this.input, metadata = {} } = {}) {
    const checkpoint = this.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(
        checkpointId
          ? `Checkpoint "${checkpointId}" not found on run "${this.id}".`
          : `Run "${this.id}" has no checkpoints to branch from.`
      );
    }

    const snapshot = checkpoint.snapshot || this.createCheckpointSnapshot();
    const branch = new Run({
      id,
      input,
      state: snapshot.state || {},
      messages: snapshot.messages || [],
      steps: snapshot.steps || [],
      toolCalls: snapshot.toolCalls || [],
      toolResults: snapshot.toolResults || [],
      metrics: snapshot.metrics || {},
      metadata: {
        ...metadata,
        lineage: {
          rootRunId: this.metadata.lineage?.rootRunId || this.id,
          parentRunId: this.metadata.lineage?.parentRunId || null,
          childRunIds: [],
          branchOriginRunId: this.id,
          branchCheckpointId: checkpoint.id,
        },
      },
    });

    branch.pendingApproval = null;
    branch.pendingPause = {
      reason: `Branched from checkpoint "${checkpoint.label}".`,
      stage: 'branch',
      sourceRunId: this.id,
      sourceCheckpointId: checkpoint.id,
    };
    branch.setStatus('paused');
    return branch;
  }

  toJSON() {
    return {
      id: this.id,
      input: this.input,
      state: this.state,
      messages: this.messages,
      steps: this.steps,
      toolCalls: this.toolCalls,
      toolResults: this.toolResults,
      checkpoints: this.checkpoints,
      errors: this.errors,
      events: this.events,
      timestamps: this.timestamps,
      status: this.status,
      output: this.output,
      pendingApproval: this.pendingApproval,
      pendingPause: this.pendingPause,
      metrics: this.metrics,
      metadata: this.metadata,
    };
  }

  static fromJSON(data = {}) {
    return new Run(data);
  }
}

module.exports = { Run };
