class EnterpriseAutonomyArchitecture {
  constructor({
    services = [],
    storage = [],
    operators = [],
    environments = [],
    metadata = {},
  } = {}) {
    this.services = Array.isArray(services) ? [...services] : [];
    this.storage = Array.isArray(storage) ? [...storage] : [];
    this.operators = Array.isArray(operators) ? [...operators] : [];
    this.environments = Array.isArray(environments) ? [...environments] : [];
    this.metadata = metadata;
  }

  build() {
    return {
      services: this.services.map(service => ({ ...service })),
      storage: this.storage.map(entry => ({ ...entry })),
      operators: this.operators.map(operator => ({ ...operator })),
      environments: this.environments.map(environment => ({ ...environment })),
      summary: {
        services: this.services.length,
        storageBackends: this.storage.length,
        operators: this.operators.length,
        environments: this.environments.length,
      },
      metadata: { ...this.metadata },
    };
  }
}

module.exports = { EnterpriseAutonomyArchitecture };
