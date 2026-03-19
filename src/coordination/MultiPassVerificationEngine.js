const { VerificationStrategySelector } = require('./VerificationStrategySelector');

class MultiPassVerificationEngine {
  constructor({
    selector = null,
    reviewers = [],
  } = {}) {
    this.selector =
      selector instanceof VerificationStrategySelector
        ? selector
        : new VerificationStrategySelector(selector || {});
    this.reviewers = Array.isArray(reviewers) ? [...reviewers] : [];
  }

  async verify(candidate = {}, { task = {}, context = {} } = {}) {
    const selection = this.selector.select(task, context);
    const phases = [];

    for (const phase of selection.phases) {
      const phaseReviewers = this.reviewers.filter(reviewer => this._reviewerRole(reviewer) === phase.role);
      const verdicts = [];

      for (const reviewer of phaseReviewers) {
        const verdict = await this._invokeReviewer(reviewer, candidate, {
          ...context,
          task,
          verificationPhase: phase,
          verificationStrategy: selection.strategy,
        });

        if (verdict) {
          verdicts.push(this._normalizeVerdict(verdict, reviewer, phase));
        }
      }

      phases.push({
        ...phase,
        verdicts,
      });
    }

    const allVerdicts = phases.flatMap(phase => phase.verdicts);
    const summary = this._summarize(selection, phases, allVerdicts);

    return {
      strategy: selection.strategy,
      selection,
      phases,
      summary,
      action: summary.action,
      verificationTrace: {
        traceType: 'coordination_verification',
        generatedAt: new Date().toISOString(),
        strategy: selection.strategy,
        taskId: task.id || candidate.id || null,
        phases: phases.map(phase => ({
          id: phase.id,
          role: phase.role,
          mode: phase.mode,
          verdicts: phase.verdicts.map(verdict => ({
            reviewerId: verdict.reviewerId,
            role: verdict.role,
            verdict: verdict.verdict,
            confidence: verdict.confidence,
          })),
        })),
        action: summary.action,
      },
    };
  }

  async _invokeReviewer(reviewer, candidate, context) {
    if (typeof reviewer === 'function') {
      return reviewer(candidate, context);
    }
    if (reviewer?.review) {
      return reviewer.review(candidate, context);
    }
    if (reviewer?.verify) {
      return reviewer.verify(candidate, context);
    }
    return null;
  }

  _normalizeVerdict(verdict = {}, reviewer, phase) {
    const normalizedVerdict = verdict.verdict || this._mapActionToVerdict(verdict.action);
    return {
      reviewerId: verdict.reviewerId || reviewer?.id || reviewer?.name || 'anonymous_reviewer',
      role: verdict.role || this._reviewerRole(reviewer) || phase.role,
      verdict: normalizedVerdict || 'accept',
      confidence:
        typeof verdict.confidence === 'number'
          ? Number(Math.max(0, Math.min(1, verdict.confidence)).toFixed(3))
          : 0.5,
      rationale: verdict.rationale || verdict.reason || null,
      metadata: {
        ...(verdict.metadata || {}),
      },
    };
  }

  _summarize(selection, phases, verdicts) {
    const verdictCounts = verdicts.reduce((acc, verdict) => {
      acc[verdict.verdict] = (acc[verdict.verdict] || 0) + 1;
      return acc;
    }, {});
    const disagreement = new Set(verdicts.map(verdict => verdict.verdict)).size > 1;
    const hasReject = Boolean(verdictCounts.reject);
    const hasRevise = Boolean(verdictCounts.revise);
    const hasEscalate = Boolean(verdictCounts.escalate);

    let action = 'accept';
    if (hasEscalate) {
      action = 'escalate';
    } else if (selection.strategy === 'adversarial_cross_check' && disagreement) {
      action = 'escalate';
    } else if (hasReject) {
      action = 'reject';
    } else if (hasRevise) {
      action = 'revise';
    }

    return {
      phasesRun: phases.length,
      totalVerdicts: verdicts.length,
      verdictCounts,
      disagreement,
      action,
      rolesUsed: [...new Set(phases.map(phase => phase.role))],
    };
  }

  _mapActionToVerdict(action) {
    if (action === 'deny') return 'reject';
    if (action === 'require_approval') return 'escalate';
    if (action === 'allow') return 'accept';
    return null;
  }

  _reviewerRole(reviewer) {
    return reviewer?.role || reviewer?.metadata?.role || null;
  }
}

module.exports = { MultiPassVerificationEngine };
