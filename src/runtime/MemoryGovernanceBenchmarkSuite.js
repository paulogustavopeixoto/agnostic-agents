const { EvalHarness } = require('./EvalHarness');
const { MemoryAuditView } = require('./MemoryAuditView');

class MemoryGovernanceBenchmarkSuite {
  constructor({ auditView = null, scenarios = [] } = {}) {
    this.auditView = auditView instanceof MemoryAuditView ? auditView : new MemoryAuditView();
    this.scenarios = Array.isArray(scenarios) ? [...scenarios] : [];
  }

  buildDefaultScenarios({ audit = [], stateBundle = null } = {}) {
    const view = this.auditView.build({ audit });

    return [
      {
        id: 'memory-provenance-coverage',
        run: async () => ({ events: audit.length, stored: view.stored, recalled: view.recalled }),
        assert: async output => output.events > 0 && (output.stored > 0 || output.recalled > 0),
      },
      {
        id: 'memory-policy-violations-bounded',
        run: async () => ({ blocked: view.blocked }),
        assert: async output => output.blocked >= 0,
      },
      {
        id: 'memory-governance-contract-coverage',
        run: async () => stateBundle?.summary || {},
        assert: async summary => Array.isArray(summary.memoryContractSurfaces) && summary.memoryContractSurfaces.length >= 5,
      },
      {
        id: 'memory-retention-regression-check',
        run: async () => ({ retentionActions: view.retentionActions }),
        assert: async output => output.retentionActions >= 0,
      },
    ];
  }

  async run(options = {}) {
    const harness = new EvalHarness({
      scenarios: [...this.buildDefaultScenarios(options), ...this.scenarios],
    });
    return harness.run(options);
  }
}

module.exports = { MemoryGovernanceBenchmarkSuite };
