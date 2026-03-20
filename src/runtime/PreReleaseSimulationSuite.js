const { EvalHarness } = require('./EvalHarness');
const { RoutePolicySimulator } = require('./RoutePolicySimulator');
const { MemoryGovernanceBenchmarkSuite } = require('./MemoryGovernanceBenchmarkSuite');
const { AutonomyBenchmarkSuite } = require('./AutonomyBenchmarkSuite');

class PreReleaseSimulationSuite {
  constructor({
    router = null,
    evalHarness = null,
    routeSimulator = null,
    memorySuite = null,
    autonomySuite = null,
  } = {}) {
    this.evalHarness = evalHarness instanceof EvalHarness ? evalHarness : new EvalHarness();
    this.routeSimulator = routeSimulator instanceof RoutePolicySimulator
      ? routeSimulator
      : new RoutePolicySimulator({ router });
    this.memorySuite = memorySuite instanceof MemoryGovernanceBenchmarkSuite
      ? memorySuite
      : new MemoryGovernanceBenchmarkSuite();
    this.autonomySuite = autonomySuite instanceof AutonomyBenchmarkSuite
      ? autonomySuite
      : new AutonomyBenchmarkSuite();
  }

  buildScenarios({
    routeScenarios = [],
    memoryAudit = [],
    stateBundle = null,
    autonomy = {},
  } = {}) {
    return [
      {
        id: 'routing-drift-rehearsal',
        run: async () => this.routeSimulator.simulate(routeScenarios),
        assert: async output => output.summary.degraded === 0,
      },
      {
        id: 'memory-drift-rehearsal',
        run: async () => this.memorySuite.run({
          audit: memoryAudit,
          stateBundle,
        }),
        assert: async output => output.failed === 0,
      },
      {
        id: 'autonomy-envelope-rehearsal',
        run: async () => this.autonomySuite.run(autonomy),
        assert: async output => output.failed === 0,
      },
    ];
  }

  async run(options = {}) {
    this.evalHarness.scenarios = this.buildScenarios(options);
    return this.evalHarness.run();
  }
}

module.exports = { PreReleaseSimulationSuite };
