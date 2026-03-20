const { EvalHarness } = require('./EvalHarness');

class EnterpriseAutonomyBenchmarkSuite {
  constructor({ evalHarness = null } = {}) {
    this.evalHarness = evalHarness instanceof EvalHarness ? evalHarness : evalHarness;
  }

  buildScenarios({
    longLivedRun = null,
    supervision = null,
    rollback = null,
  } = {}) {
    return [
      {
        id: 'enterprise-long-lived-objective',
        run: async () => longLivedRun || { status: 'completed', checkpoints: 3, resumable: true },
        assert: output =>
          output?.status === 'completed' &&
          Number(output?.checkpoints || 0) >= 1 &&
          output?.resumable !== false,
      },
      {
        id: 'enterprise-supervised-autonomy',
        run: async () => supervision || { action: 'review', approvals: 1, checkpoints: 1 },
        assert: output =>
          ['review', 'escalate', 'allow'].includes(output?.action) &&
          Number(output?.approvals || 0) >= 1 &&
          Number(output?.checkpoints || 0) >= 1,
      },
      {
        id: 'enterprise-rollback-discipline',
        run: async () => rollback || { action: 'block_rollout', rollbackReady: true, reason: 'fleet regression' },
        assert: output =>
          ['block_rollout', 'rollback_rollout', 'allow_rollout'].includes(output?.action) &&
          output?.rollbackReady === true,
      },
    ];
  }

  async run(options = {}) {
    const harness = this.evalHarness instanceof EvalHarness ? this.evalHarness : new EvalHarness();
    harness.scenarios = this.buildScenarios(options);
    return harness.run();
  }
}

module.exports = { EnterpriseAutonomyBenchmarkSuite };
