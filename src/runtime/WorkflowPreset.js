class WorkflowPreset {
  constructor({ id, workflow = null, defaults = {}, metadata = {} } = {}) {
    if (!id) {
      throw new Error('WorkflowPreset requires id.');
    }
    this.id = id;
    this.workflow = workflow;
    this.defaults = defaults;
    this.metadata = metadata;
  }

  instantiate(overrides = {}) {
    return {
      workflow: this.workflow,
      defaults: {
        ...this.defaults,
        ...overrides,
      },
      metadata: this.metadata,
    };
  }
}

module.exports = { WorkflowPreset };
