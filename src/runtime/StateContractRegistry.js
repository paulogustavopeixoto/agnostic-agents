class StateContractRegistry {
  constructor({ contracts = {} } = {}) {
    this.contracts = {
      state_bundle: {
        authoritative: [
          'run.id',
          'run.status',
          'run.state',
          'run.messages',
          'run.steps',
          'run.toolCalls',
          'run.toolResults',
          'run.checkpoints',
          'run.metrics',
          'run.metadata.lineage',
          'memory',
        ],
        derived: [
          'summary.runId',
          'summary.status',
          'summary.checkpointCount',
          'summary.messageCount',
          'summary.toolCallCount',
          'summary.memoryLayers',
        ],
        restorationCritical: [
          'run.id',
          'run.status',
          'run.state',
          'run.checkpoints',
          'run.metadata.lineage',
        ],
      },
      ...contracts,
    };
  }

  describe(name = 'state_bundle') {
    return this.contracts[name] || null;
  }
}

module.exports = { StateContractRegistry };
