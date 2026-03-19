class AssuranceReport {
  constructor({ invariants = [], scenarios = [] } = {}) {
    this.invariants = Array.isArray(invariants) ? [...invariants] : [];
    this.scenarios = Array.isArray(scenarios) ? [...scenarios] : [];
  }

  summarize() {
    const invariantFailures = this.invariants.filter(item => item.passed === false);
    const scenarioFailures = this.scenarios.filter(item => item.passed === false);

    return {
      invariantCount: this.invariants.length,
      scenarioCount: this.scenarios.length,
      failedInvariants: invariantFailures.length,
      failedScenarios: scenarioFailures.length,
      verdict: invariantFailures.length || scenarioFailures.length ? 'block' : 'allow',
    };
  }

  explain() {
    const summary = this.summarize();
    const violations = [
      ...this.invariants.filter(item => item.passed === false).map(item => ({
        type: 'invariant',
        id: item.id,
        surface: item.surface,
        severity: item.severity,
        reason: item.details?.reason || item.details?.error || item.description || null,
      })),
      ...this.scenarios.filter(item => item.passed === false).map(item => ({
        type: 'scenario',
        id: item.id,
        severity: 'high',
        reason: item.error || 'Scenario failed.',
      })),
    ];

    return {
      ...summary,
      violations,
      operatorSummary:
        summary.verdict === 'allow'
          ? 'Assurance checks passed; the rollout candidate can proceed.'
          : 'Assurance checks failed; block rollout until the reported violations are resolved.',
    };
  }

  toJSON() {
    return {
      invariants: [...this.invariants],
      scenarios: [...this.scenarios],
      summary: this.summarize(),
      explanation: this.explain(),
    };
  }
}

module.exports = { AssuranceReport };
