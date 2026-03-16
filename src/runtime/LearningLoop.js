class LearningLoop {
  constructor({ runs = [], evaluations = [], feedback = [] } = {}) {
    this.runs = [...runs];
    this.evaluations = [...evaluations];
    this.feedback = [...feedback];
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
      pendingApproval: run.pendingApproval || run.state?.pendingApproval || null,
      pendingPause: run.pendingPause || run.state?.pendingPause || null,
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
    for (const item of this._extractEvaluationFeedback(summary)) {
      this.feedback.push(item);
    }
    return summary;
  }

  recordFeedback(item) {
    const feedback = {
      source: item?.source || 'operator',
      category: item?.category || 'general',
      severity: item?.severity || 'medium',
      message: item?.message || '',
      scenarioId: item?.scenarioId || null,
      metadata: item?.metadata || {},
    };
    this.feedback.push(feedback);
    return feedback;
  }

  summarize() {
    const failedRuns = this.runs.filter(run => run.status === 'failed').length;
    const verificationFlags = this.runs.filter(run => {
      const verdict = run.selfVerification?.action || run.selfVerification?.status || null;
      return verdict && verdict !== 'allow' && verdict !== 'passed';
    }).length;
    const failedEvaluations = this.evaluations.reduce((sum, report) => sum + (report.failed || 0), 0);
    const approvalBlocks = this.runs.filter(run => Boolean(run.pendingApproval)).length;
    const pausedRuns = this.runs.filter(run => run.status === 'paused' || Boolean(run.pendingPause)).length;
    const lowConfidenceRuns = this.runs.filter(run => {
      const confidence = run.assessment?.confidence;
      return typeof confidence === 'number' && confidence < 0.7;
    }).length;
    const evidenceConflictRuns = this.runs.filter(run => (run.assessment?.evidenceConflicts || 0) > 0).length;
    const confidenceValues = this.runs
      .map(run => run.assessment?.confidence)
      .filter(value => typeof value === 'number');
    const averageConfidence = confidenceValues.length
      ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(2))
      : null;
    const feedbackSummary = this._summarizeFeedback();

    return {
      recordedRuns: this.runs.length,
      failedRuns,
      evaluations: this.evaluations.length,
      failedEvaluations,
      verificationFlags,
      approvalBlocks,
      pausedRuns,
      lowConfidenceRuns,
      evidenceConflictRuns,
      averageConfidence,
      feedbackItems: this.feedback.length,
      feedbackByCategory: feedbackSummary.byCategory,
      recurringIssues: feedbackSummary.topIssues,
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

  buildAdaptiveRecommendations() {
    const summary = this.summarize();
    const recommendations = [];

    if (summary.failedEvaluations > 0) {
      recommendations.push({
        id: 'eval-failures',
        category: 'evaluation',
        priority: 'high',
        reason: 'Recent eval failures indicate unstable behavior in maintained scenarios.',
        evidence: {
          failedEvaluations: summary.failedEvaluations,
          feedbackByCategory: summary.feedbackByCategory,
        },
        suggestedActions: [
          'Tighten prompts or tool contracts for failing scenarios.',
          'Add replay-backed regression fixtures before changing runtime routing.',
        ],
      });
    }

    if (summary.verificationFlags > 0 || summary.approvalBlocks > 0) {
      recommendations.push({
        id: 'governance-pressure',
        category: 'governance',
        priority: 'high',
        reason: 'Verifier denials or approval blocks suggest the runtime is pushing into risky paths.',
        evidence: {
          verificationFlags: summary.verificationFlags,
          approvalBlocks: summary.approvalBlocks,
        },
        suggestedActions: [
          'Review tool policy and approval routing for the affected flows.',
          'Prefer stronger verifier composition before increasing autonomy.',
        ],
      });
    }

    if (summary.lowConfidenceRuns > 0 || summary.evidenceConflictRuns > 0) {
      recommendations.push({
        id: 'grounding-quality',
        category: 'routing',
        priority: summary.evidenceConflictRuns > 0 ? 'high' : 'medium',
        reason: 'Low-confidence or conflicting runs indicate grounding and routing quality can improve.',
        evidence: {
          lowConfidenceRuns: summary.lowConfidenceRuns,
          evidenceConflictRuns: summary.evidenceConflictRuns,
          averageConfidence: summary.averageConfidence,
        },
        suggestedActions: [
          'Review retrieval coverage and verifier thresholds for uncertain runs.',
          'Prefer routes or reviewers that historically reduce evidence conflicts.',
        ],
      });
    }

    if (summary.feedbackByCategory.tooling > 0 || summary.feedbackByCategory.integration > 0) {
      recommendations.push({
        id: 'tooling-stability',
        category: 'operations',
        priority: 'medium',
        reason: 'Feedback signals point to tool or integration instability across recent runs.',
        evidence: {
          toolingFeedback: summary.feedbackByCategory.tooling || 0,
          integrationFeedback: summary.feedbackByCategory.integration || 0,
          recurringIssues: summary.recurringIssues,
        },
        suggestedActions: [
          'Audit the affected tool adapters and integration contracts.',
          'Add targeted eval scenarios for the recurring failure patterns.',
        ],
      });
    }

    if (!recommendations.length) {
      recommendations.push({
        id: 'stable-baseline',
        category: 'benchmarking',
        priority: 'low',
        reason: 'Current runs and evals look stable; use this period to expand benchmark coverage.',
        evidence: {
          recordedRuns: summary.recordedRuns,
          evaluations: summary.evaluations,
          averageConfidence: summary.averageConfidence,
        },
        suggestedActions: [
          'Add benchmark scenarios before changing runtime routing.',
        ],
      });
    }

    return recommendations;
  }

  _extractEvaluationFeedback(report) {
    const items = [];
    for (const result of report.results || []) {
      if (result?.feedback && Array.isArray(result.feedback)) {
        for (const item of result.feedback) {
          items.push({
            source: 'evaluation',
            category: item?.category || 'evaluation',
            severity: item?.severity || (result.passed ? 'low' : 'medium'),
            message: item?.message || '',
            scenarioId: result.id || null,
            metadata: item?.metadata || {},
          });
        }
      }
      if (result?.passed === false) {
        items.push({
          source: 'evaluation',
          category: result?.category || 'evaluation',
          severity: 'medium',
          message: result?.error || `scenario:${result.id || 'unknown'} failed`,
          scenarioId: result?.id || null,
          metadata: {
            durationMs: result?.durationMs || 0,
          },
        });
      }
    }
    return items;
  }

  _summarizeFeedback() {
    const byCategory = {};
    const byMessage = {};

    for (const item of this.feedback) {
      const category = item.category || 'general';
      byCategory[category] = (byCategory[category] || 0) + 1;
      const key = item.message || category;
      byMessage[key] = (byMessage[key] || 0) + 1;
    }

    const topIssues = Object.entries(byMessage)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([message, count]) => ({ message, count }));

    return {
      byCategory,
      topIssues,
    };
  }
}

module.exports = { LearningLoop };
