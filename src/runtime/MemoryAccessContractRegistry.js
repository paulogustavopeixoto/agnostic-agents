class MemoryAccessContractRegistry {
  constructor({ contracts = {} } = {}) {
    this.contracts = {
      runtime: {
        read: ['working', 'profile', 'policy', 'semantic'],
        write: ['working', 'profile', 'policy', 'semantic'],
      },
      workflow: {
        read: ['working', 'profile', 'policy'],
        write: ['working', 'profile'],
      },
      coordination: {
        read: ['working', 'profile', 'policy'],
        write: ['working'],
      },
      learning: {
        read: ['working', 'profile', 'policy', 'semantic'],
        write: ['policy'],
      },
      operator: {
        read: ['working', 'profile', 'policy', 'semantic'],
        write: ['policy'],
      },
      ...contracts,
    };
  }

  describe(surface) {
    return this.contracts[surface] || null;
  }

  list() {
    return JSON.parse(JSON.stringify(this.contracts));
  }

  allows(surface, action, layer) {
    const contract = this.describe(surface);
    if (!contract) {
      return false;
    }
    return Array.isArray(contract[action]) && contract[action].includes(layer);
  }
}

module.exports = { MemoryAccessContractRegistry };
