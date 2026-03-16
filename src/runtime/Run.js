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
      },
      debug: metrics.debug || {},
    };
    this.metadata = { ...metadata };
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
