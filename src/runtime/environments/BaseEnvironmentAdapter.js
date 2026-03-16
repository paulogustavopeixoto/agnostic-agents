class BaseEnvironmentAdapter {
  constructor({ kind = 'base', actions = [], execute = null, metadata = {} } = {}) {
    this.kind = kind;
    this.actions = [...actions];
    this.executeHandler = execute;
    this.metadata = { ...metadata };
  }

  supports(action) {
    return this.actions.length === 0 || this.actions.includes(action);
  }

  async execute(action, payload = {}, context = {}) {
    if (!this.supports(action)) {
      throw new Error(`Environment adapter "${this.kind}" does not support action "${action}".`);
    }
    if (typeof this.executeHandler !== 'function') {
      throw new Error(`Environment adapter "${this.kind}" does not define an execute handler.`);
    }

    return this.executeHandler(action, payload, context);
  }

  describe() {
    return {
      kind: this.kind,
      actions: [...this.actions],
      metadata: { ...this.metadata },
    };
  }
}

module.exports = { BaseEnvironmentAdapter };
