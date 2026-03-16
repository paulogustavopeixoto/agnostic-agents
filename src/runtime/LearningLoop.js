class LearningLoop {
  constructor({ runs = [], evaluations = [] } = {}) {
    this.runs = [...runs];
    this.evaluations = [...evaluations];
  }

  recordRun(run) {
    const summary = {
      id: run.id,
      status: run.status,
      errorCount: Array.isArray(run.errors) ? run.errors.length : 0,
      toolCalls: Array.isArray(run.toolCalls) ? run.toolCalls.length : 0,
      toolResults: Array.isArray(run.toolResults) ? run.toolResults.length : 0,
      assessment: run.state?.assessment || null,
      selfVerification: run.state?.selfVerification || null,
    };
    this.runs.push(summary);
    return summary;
  }

  recordEvaluation(report) {
    const summary = {
      total: report.total || 0,
      passed: report.passed || 0,
      failed: report.failed || 0,
      results: [...(report.results || [])],
    };
    this.evaluations.push(summary);
    return summary;
  }

  summarize() {
    const failedRuns = this.runs.filter(run => run.status === 'failed').length;
    const verificationFlags = this.runs.filter(run => {
      const verdict = run.selfVerification?.action || run.selfVerification?.status || null;
      return verdict && verdict !== 'allow' && verdict !== 'passed';
    }).length;
    const failedEvaluations = this.evaluations.reduce((sum, report) => sum + (report.failed || 0), 0);

    return {
      recordedRuns: this.runs.length,
      failedRuns,
      evaluations: this.evaluations.length,
      failedEvaluations,
      verificationFlags,
    };
  }

  buildRecommendations() {
    const summary = this.summarize();
    const recommendations = [];

    if (summary.failedRuns > 0) {
      recommendations.push('Investigate failed runs and add replay-based regression coverage.');
    }
    if (summary.failedEvaluations > 0) {
      recommendations.push('Tighten prompts, tool contracts, or policies for scenarios failing the eval harness.');
    }
    if (summary.verificationFlags > 0) {
      recommendations.push('Review verifier denials and require approval or stronger routing for risky actions.');
    }
    if (!recommendations.length) {
      recommendations.push('Current runs and evals look stable; expand the benchmark set before changing runtime behavior.');
    }

    return recommendations;
  }
}

module.exports = { LearningLoop };
