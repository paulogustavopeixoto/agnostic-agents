const { EvalHarness } = require('../runtime/EvalHarness');

/**
 * Builds and optionally runs maintained coordination benchmark scenarios.
 */
class CoordinationBenchmarkSuite {
  /**
   * @param {object} [options]
   * @param {object|null} [options.critiqueProtocol]
   * @param {object|null} [options.disagreementResolver]
   * @param {object|null} [options.coordinationLoop]
   * @param {object|null} [options.decompositionAdvisor]
   * @param {object|null} [options.evalHarness]
   */
  constructor({
    critiqueProtocol = null,
    disagreementResolver = null,
    coordinationLoop = null,
    decompositionAdvisor = null,
    evalHarness = null,
  } = {}) {
    this.critiqueProtocol = critiqueProtocol;
    this.disagreementResolver = disagreementResolver;
    this.coordinationLoop = coordinationLoop;
    this.decompositionAdvisor = decompositionAdvisor;
    this.evalHarness = evalHarness;
  }

  /**
   * Build maintained coordination scenarios.
   *
   * @param {object} [options]
   * @returns {Array<object>}
   */
  buildScenarios({
    candidate = {},
    reviewContext = {},
    expectedResolutionAction = null,
    decompositionTask = null,
    decompositionOptions = {},
    expectedDecompositionAction = null,
  } = {}) {
    const scenarios = [];

    if (this.critiqueProtocol) {
      scenarios.push({
        id: 'coordination-critique-benchmark',
        run: async () => this.critiqueProtocol.review(candidate, reviewContext),
        assert: review =>
          Array.isArray(review?.critiques) &&
          review.critiques.length > 0 &&
          review.summary?.total === review.critiques.length,
      });
    }

    if (this.critiqueProtocol && this.disagreementResolver) {
      scenarios.push({
        id: 'coordination-resolution-benchmark',
        run: async () => {
          const review = await this.critiqueProtocol.review(candidate, reviewContext);
          return this.disagreementResolver.resolve(review.critiques, reviewContext);
        },
        assert: resolution =>
          resolution &&
          (expectedResolutionAction ? resolution.action === expectedResolutionAction : Boolean(resolution.action)),
      });
    }

    if (this.coordinationLoop) {
      scenarios.push({
        id: 'coordination-loop-benchmark',
        run: async () => this.coordinationLoop.coordinate(candidate, reviewContext),
        assert: record =>
          record?.review?.summary?.total > 0 &&
          Boolean(record?.resolution?.action) &&
          Boolean(record?.result?.action),
      });
    }

    if (this.decompositionAdvisor && decompositionTask) {
      scenarios.push({
        id: 'coordination-decomposition-benchmark',
        run: async () => this.decompositionAdvisor.recommend(decompositionTask, decompositionOptions),
        assert: recommendation =>
          recommendation &&
          (expectedDecompositionAction
            ? recommendation.action === expectedDecompositionAction
            : Boolean(recommendation.action)),
      });
    }

    return scenarios;
  }

  /**
   * Run the maintained coordination benchmark scenarios.
   *
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async run(options = {}) {
    const harness =
      this.evalHarness ||
      new EvalHarness({
        scenarios: this.buildScenarios(options),
      });

    return harness.run(options);
  }
}

module.exports = { CoordinationBenchmarkSuite };
