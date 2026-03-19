const { EvalHarness } = require('./EvalHarness');
const { ImprovementEffectTracker } = require('./ImprovementEffectTracker');

class LearningBenchmarkSuite {
  constructor({ effectTracker = null, scenarios = [] } = {}) {
    this.effectTracker =
      effectTracker instanceof ImprovementEffectTracker
        ? effectTracker
        : new ImprovementEffectTracker(effectTracker || {});
    this.scenarios = Array.isArray(scenarios) ? [...scenarios] : [];
  }

  buildDefaultScenarios() {
    return [
      {
        id: 'learning-effect-improvement',
        run: async () => this.effectTracker.summarize(),
        assert: async summary => summary.improved >= summary.regressed,
      },
      {
        id: 'learning-effect-net-positive',
        run: async () => this.effectTracker.summarize(),
        assert: async summary => summary.netPositive === true,
      },
    ];
  }

  async run(options = {}) {
    const harness = new EvalHarness({
      scenarios: [...this.buildDefaultScenarios(), ...this.scenarios],
    });
    return harness.run(options);
  }
}

module.exports = { LearningBenchmarkSuite };
