class EvalHarness {
  constructor({ scenarios = [] } = {}) {
    this.scenarios = [...scenarios];
  }

  async run({ learningLoop = null } = {}) {
    const results = [];

    for (const scenario of this.scenarios) {
      const startedAt = Date.now();
      try {
        const output = await scenario.run();
        // An absent/undefined verdict is not positive evaluation evidence.
        const passed = typeof scenario.assert === 'function' && await scenario.assert(output) === true;
        results.push({
          id: scenario.id,
          passed,
          durationMs: Date.now() - startedAt,
          error: null,
        });
      } catch (error) {
        results.push({
          id: scenario.id,
          passed: false,
          durationMs: Date.now() - startedAt,
          error: error.message || String(error),
        });
      }
    }

    const report = {
      total: results.length,
      passed: results.filter(result => result.passed).length,
      failed: results.filter(result => !result.passed).length,
      results,
    };

    if (learningLoop?.recordEvaluation) {
      await learningLoop.recordEvaluation(report);
    }

    return report;
  }
}

module.exports = { EvalHarness };
