class WorkflowOutcomeContract {
  constructor({
    id = null,
    objective = null,
    acceptanceCriteria = [],
    operatorReviewPoints = [],
    metrics = [],
    metadata = {},
  } = {}) {
    this.id = id || `outcome-contract:${Date.now()}`;
    this.objective = objective;
    this.acceptanceCriteria = Array.isArray(acceptanceCriteria) ? [...acceptanceCriteria] : [];
    this.operatorReviewPoints = Array.isArray(operatorReviewPoints) ? [...operatorReviewPoints] : [];
    this.metrics = Array.isArray(metrics) ? [...metrics] : [];
    this.metadata = metadata || {};
  }

  evaluate(result = {}) {
    const checks = this.acceptanceCriteria.map(criteria => {
      const actual = result?.[criteria.key];
      const passed = typeof criteria.expected === 'function'
        ? Boolean(criteria.expected(actual, result))
        : actual === criteria.expected;
      return {
        key: criteria.key,
        expected: typeof criteria.expected === 'function' ? 'predicate' : criteria.expected,
        actual,
        passed,
      };
    });

    return {
      contractId: this.id,
      objective: this.objective,
      passed: checks.every(check => check.passed),
      checks,
      reviewPoints: [...this.operatorReviewPoints],
      metrics: [...this.metrics],
    };
  }

  toJSON() {
    return {
      kind: 'agnostic-agents/workflow-outcome-contract',
      version: '1.0.0',
      id: this.id,
      objective: this.objective,
      acceptanceCriteria: [...this.acceptanceCriteria],
      operatorReviewPoints: [...this.operatorReviewPoints],
      metrics: [...this.metrics],
      metadata: { ...this.metadata },
    };
  }
}

module.exports = { WorkflowOutcomeContract };
