const { LearningLoop } = require('./LearningLoop');

/**
 * Turns replay, eval, and learning-loop signals into operator-facing policy
 * tuning suggestions without mutating runtime behavior automatically.
 */
class PolicyTuningAdvisor {
  /**
   * @param {object} [options]
   * @param {LearningLoop|null} [options.learningLoop]
   */
  constructor({ learningLoop = null } = {}) {
    this.learningLoop = learningLoop instanceof LearningLoop ? learningLoop : learningLoop;
  }

  /**
   * Build structured policy recommendations from recent adaptive signals.
   *
   * @param {object} [options]
   * @param {object|null} [options.branchAnalysis]
   * @param {object|null} [options.evaluationReport]
   * @returns {object[]}
   */
  buildSuggestions({ branchAnalysis = null, evaluationReport = null } = {}) {
    const summary = this.learningLoop?.summarize ? this.learningLoop.summarize() : {};
    const adaptive = this.learningLoop?.buildAdaptiveRecommendations
      ? this.learningLoop.buildAdaptiveRecommendations()
      : [];
    const suggestions = [];

    if ((summary.verificationFlags || 0) > 0 || (summary.approvalBlocks || 0) > 0) {
      suggestions.push({
        id: 'tighten-side-effect-policy',
        category: 'tool_policy',
        priority: 'high',
        suggestion: 'Require approval for higher-risk tools until verifier and approval pressure drops.',
        rationale:
          'Recent runs triggered verifier denials or approval pressure, which suggests the current tool policy is too permissive for risky paths.',
        evidence: {
          verificationFlags: summary.verificationFlags || 0,
          approvalBlocks: summary.approvalBlocks || 0,
        },
      });
    }

    if ((summary.lowConfidenceRuns || 0) > 0 || (summary.evidenceConflictRuns || 0) > 0) {
      suggestions.push({
        id: 'strengthen-reviewer-composition',
        category: 'verifier_policy',
        priority: (summary.evidenceConflictRuns || 0) > 0 ? 'high' : 'medium',
        suggestion: 'Route low-confidence or conflicting paths through stronger verifier/reviewer composition.',
        rationale:
          'Confidence and evidence conflict signals indicate that risk should be absorbed by review policy rather than by wider model autonomy.',
        evidence: {
          lowConfidenceRuns: summary.lowConfidenceRuns || 0,
          evidenceConflictRuns: summary.evidenceConflictRuns || 0,
          averageConfidence: summary.averageConfidence || null,
        },
      });
    }

    if (branchAnalysis?.bestRunId && branchAnalysis.bestRunId !== branchAnalysis.baselineRunId) {
      const divergence = (branchAnalysis.comparisons || []).find(
        item => item.runId === branchAnalysis.bestRunId
      );
      suggestions.push({
        id: 'promote-healthier-branch-baseline',
        category: 'routing_policy',
        priority: 'medium',
        suggestion: 'Use the healthiest replay/branch as the baseline when tuning routing and review policy.',
        rationale:
          'A replay or branch outperformed the current baseline, so policy analysis should start from the better path rather than the original failure.',
        evidence: {
          baselineRunId: branchAnalysis.baselineRunId,
          bestRunId: branchAnalysis.bestRunId,
          firstDivergingStepIndex: divergence?.diff?.firstDivergingStepIndex ?? -1,
        },
      });
    }

    if ((evaluationReport?.failed || 0) > 0 || (summary.failedEvaluations || 0) > 0) {
      suggestions.push({
        id: 'convert-failing-evals-into-policy-tests',
        category: 'evaluation_policy',
        priority: 'medium',
        suggestion: 'Turn failing eval scenarios into explicit policy and routing regression gates.',
        rationale:
          'Repeated eval failures should harden policy expectations, not remain advisory-only signals.',
        evidence: {
          failedEvaluations: evaluationReport?.failed || summary.failedEvaluations || 0,
          feedbackByCategory: summary.feedbackByCategory || {},
        },
      });
    }

    if (!suggestions.length && adaptive.length) {
      suggestions.push({
        id: 'stable-policy-baseline',
        category: 'policy_hygiene',
        priority: 'low',
        suggestion: 'Keep the current policy baseline and expand replay/eval coverage before changing runtime controls.',
        rationale: 'Adaptive signals are currently stable enough that changing policy would be premature.',
        evidence: {
          adaptiveRecommendations: adaptive.length,
          recurringIssues: summary.recurringIssues || [],
        },
      });
    }

    return suggestions;
  }
}

module.exports = { PolicyTuningAdvisor };
