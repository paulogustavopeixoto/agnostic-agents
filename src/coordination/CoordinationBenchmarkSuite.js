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
    roleAwareCoordinationPlanner = null,
    evalHarness = null,
  } = {}) {
    this.critiqueProtocol = critiqueProtocol;
    this.disagreementResolver = disagreementResolver;
    this.coordinationLoop = coordinationLoop;
    this.decompositionAdvisor = decompositionAdvisor;
    this.roleAwareCoordinationPlanner = roleAwareCoordinationPlanner;
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
    disagreementCritiques = null,
    expectedDisagreementAction = null,
    recoveryCandidate = null,
    recoveryContext = {},
    expectedRecoveryAction = null,
    decompositionTask = null,
    decompositionOptions = {},
    expectedDecompositionAction = null,
    roleTask = null,
    roleActors = [],
    roleContext = {},
    expectedRoleStrategy = null,
    failureDecompositionTask = null,
    failureDecompositionOptions = {},
    expectedFailureDecompositionAction = null,
    trustSensitiveCritiques = null,
    expectedTrustAction = null,
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

    if (this.disagreementResolver && Array.isArray(disagreementCritiques)) {
      scenarios.push({
        id: 'coordination-disagreement-benchmark',
        run: async () => this.disagreementResolver.resolve(disagreementCritiques, reviewContext),
        assert: resolution =>
          resolution &&
          (expectedDisagreementAction ? resolution.action === expectedDisagreementAction : Boolean(resolution.action)),
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

    if (this.coordinationLoop && recoveryCandidate) {
      scenarios.push({
        id: 'coordination-recovery-benchmark',
        run: async () => this.coordinationLoop.coordinate(recoveryCandidate, recoveryContext),
        assert: record =>
          record &&
          (expectedRecoveryAction
            ? record.resolution?.action === expectedRecoveryAction
            : Boolean(record.resolution?.action)),
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

    if (this.roleAwareCoordinationPlanner && roleTask) {
      scenarios.push({
        id: 'coordination-role-routing-benchmark',
        run: async () =>
          this.roleAwareCoordinationPlanner.plan(roleTask, {
            actors: roleActors,
            context: roleContext,
          }),
        assert: plan =>
          plan &&
          (expectedRoleStrategy ? plan.strategy === expectedRoleStrategy : Boolean(plan.strategy)),
      });
    }

    if (this.decompositionAdvisor && failureDecompositionTask) {
      scenarios.push({
        id: 'coordination-failure-decomposition-benchmark',
        run: async () => this.decompositionAdvisor.recommend(failureDecompositionTask, failureDecompositionOptions),
        assert: recommendation =>
          recommendation &&
          (expectedFailureDecompositionAction
            ? recommendation.action === expectedFailureDecompositionAction
            : Boolean(recommendation.action)),
      });
    }

    if (this.disagreementResolver && Array.isArray(trustSensitiveCritiques)) {
      scenarios.push({
        id: 'coordination-trust-assumption-benchmark',
        run: async () => this.disagreementResolver.resolve(trustSensitiveCritiques, reviewContext),
        assert: resolution =>
          resolution &&
          (expectedTrustAction ? resolution.action === expectedTrustAction : Boolean(resolution.action)),
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
