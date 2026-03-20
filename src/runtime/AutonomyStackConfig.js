class AutonomyStackConfig {
  constructor({
    id = null,
    environment = null,
    tenant = null,
    routing = {},
    policy = {},
    memory = {},
    autonomy = {},
    fleet = {},
    operator = {},
    metadata = {},
  } = {}) {
    this.id = id;
    this.environment = environment;
    this.tenant = tenant;
    this.routing = { ...routing };
    this.policy = { ...policy };
    this.memory = { ...memory };
    this.autonomy = { ...autonomy };
    this.fleet = { ...fleet };
    this.operator = { ...operator };
    this.metadata = { ...metadata };
  }

  toJSON() {
    return {
      kind: 'agnostic-agents/autonomy-stack-config',
      version: '1.0.0',
      id: this.id,
      environment: this.environment,
      tenant: this.tenant,
      routing: { ...this.routing },
      policy: { ...this.policy },
      memory: { ...this.memory },
      autonomy: { ...this.autonomy },
      fleet: { ...this.fleet },
      operator: { ...this.operator },
      metadata: { ...this.metadata },
    };
  }

  static fromJSON(payload = {}) {
    return new AutonomyStackConfig(payload);
  }
}

module.exports = { AutonomyStackConfig };
