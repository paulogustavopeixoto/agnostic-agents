const { Run } = require('./Run');

class StateBundle {
  static get SCHEMA_VERSION() {
    return '1.0';
  }

  static get FORMAT() {
    return 'agnostic-agents-state-bundle';
  }

  constructor({
    run = null,
    memory = null,
    metadata = {},
  } = {}) {
    this.run = run instanceof Run ? run : run ? Run.fromJSON(run) : null;
    this.memory = memory ? JSON.parse(JSON.stringify(memory)) : null;
    this.metadata = { ...metadata };
  }

  summarize() {
    return {
      runId: this.run?.id || null,
      status: this.run?.status || null,
      checkpointCount: this.run?.checkpoints?.length || 0,
      messageCount: this.run?.messages?.length || 0,
      toolCallCount: this.run?.toolCalls?.length || 0,
      memoryLayers: this.memory ? Object.keys(this.memory) : [],
      metadata: this.metadata,
    };
  }

  toJSON() {
    return {
      schemaVersion: StateBundle.SCHEMA_VERSION,
      format: StateBundle.FORMAT,
      exportedAt: new Date().toISOString(),
      metadata: { ...this.metadata },
      run: this.run ? this.run.toJSON() : null,
      memory: this.memory ? JSON.parse(JSON.stringify(this.memory)) : null,
      summary: this.summarize(),
    };
  }

  static fromJSON(payload = {}) {
    return new StateBundle({
      run: payload.run || null,
      memory: payload.memory || null,
      metadata: payload.metadata || {},
    });
  }
}

module.exports = { StateBundle };
