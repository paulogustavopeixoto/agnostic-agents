const { EvalHarness } = require('./EvalHarness');

class FailureInjectionSuite {
  constructor({ evalHarness = null } = {}) {
    this.evalHarness = evalHarness instanceof EvalHarness ? evalHarness : new EvalHarness();
  }

  buildScenarios({
    worker = {},
    fleet = {},
    controlPlane = {},
  } = {}) {
    return [
      {
        id: 'worker-recovery-chaos',
        run: async () => ({
          recovered: worker.recovered !== false,
          checkpointed: worker.checkpointed !== false,
        }),
        assert: async output => output.recovered === true && output.checkpointed === true,
      },
      {
        id: 'fleet-canary-chaos',
        run: async () => ({
          halted: fleet.halted !== false,
          rollbackReady: fleet.rollbackReady !== false,
        }),
        assert: async output => output.halted === true && output.rollbackReady === true,
      },
      {
        id: 'control-plane-failover-chaos',
        run: async () => ({
          auditPreserved: controlPlane.auditPreserved !== false,
          operatorFallback: controlPlane.operatorFallback !== false,
        }),
        assert: async output => output.auditPreserved === true && output.operatorFallback === true,
      },
    ];
  }

  async run(options = {}) {
    this.evalHarness.scenarios = this.buildScenarios(options);
    return this.evalHarness.run();
  }
}

module.exports = { FailureInjectionSuite };
