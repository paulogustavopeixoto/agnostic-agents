class DelegationContract {
  constructor({
    id,
    description = '',
    assignee = null,
    requiredInputs = [],
    requiredCapabilities = [],
    inputValidator = null,
    outputValidator = null,
    metadata = {},
  } = {}) {
    if (!id) {
      throw new Error('DelegationContract requires an id.');
    }

    this.id = id;
    this.description = description;
    this.assignee = assignee;
    this.requiredInputs = [...requiredInputs];
    this.requiredCapabilities = [...requiredCapabilities];
    this.inputValidator = inputValidator;
    this.outputValidator = outputValidator;
    this.metadata = { ...metadata };
  }

  validateInput(payload = {}) {
    for (const key of this.requiredInputs) {
      if (!(key in payload) || payload[key] == null) {
        throw new Error(`Delegation contract "${this.id}" missing required input "${key}".`);
      }
    }

    if (typeof this.inputValidator === 'function') {
      const result = this.inputValidator(payload);
      if (result === false) {
        throw new Error(`Delegation contract "${this.id}" rejected the input payload.`);
      }
    }

    return true;
  }

  validateCapabilities(agent) {
    if (!this.requiredCapabilities.length) {
      return true;
    }

    const capabilities =
      typeof agent?.adapter?.getCapabilities === 'function'
        ? agent.adapter.getCapabilities()
        : null;

    if (!capabilities) {
      throw new Error(
        `Delegation contract "${this.id}" requires adapter capabilities, but the delegate agent does not expose getCapabilities().`
      );
    }

    for (const capability of this.requiredCapabilities) {
      if (!capabilities[capability]) {
        throw new Error(
          `Delegation contract "${this.id}" requires capability "${capability}", which the delegate agent does not support.`
        );
      }
    }

    return true;
  }

  validateOutput(payload) {
    if (typeof this.outputValidator === 'function') {
      const result = this.outputValidator(payload);
      if (result === false) {
        throw new Error(`Delegation contract "${this.id}" rejected the output payload.`);
      }
    }

    return true;
  }

  toJSON() {
    return {
      id: this.id,
      description: this.description,
      assignee: this.assignee,
      requiredInputs: [...this.requiredInputs],
      requiredCapabilities: [...this.requiredCapabilities],
      metadata: { ...this.metadata },
    };
  }
}

module.exports = { DelegationContract };
