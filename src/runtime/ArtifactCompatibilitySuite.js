const { ConformanceKit } = require('./ConformanceKit');

class ArtifactCompatibilitySuite {
  constructor({ conformanceKit = null } = {}) {
    this.conformanceKit =
      conformanceKit instanceof ConformanceKit
        ? conformanceKit
        : new ConformanceKit(conformanceKit || {});
  }

  run(fixtures = {}) {
    const checks = [];
    const mapping = [
      ['trace', 'trace'],
      ['traceBundle', 'traceBundle'],
      ['policyPack', 'policyPack'],
      ['policyEvaluation', 'policyEvaluation'],
      ['stateBundle', 'stateBundle'],
      ['evalReport', 'evalReport'],
      ['manifest', 'manifest'],
    ];

    for (const [key, type] of mapping) {
      if (!fixtures[key]) {
        continue;
      }

      const result = this.conformanceKit.validateArtifact(fixtures[key], { type });
      checks.push({
        id: `${type}-compatibility`,
        type,
        valid: result.valid,
        errors: [...result.errors],
      });
    }

    return {
      total: checks.length,
      passed: checks.filter(check => check.valid).length,
      failed: checks.filter(check => !check.valid).length,
      checks,
    };
  }
}

module.exports = { ArtifactCompatibilitySuite };
