const { LearnedAdaptationArtifact } = require('./LearnedAdaptationArtifact');

class ImprovementActionPlanner {
  buildPlans(proposals = []) {
    return (Array.isArray(proposals) ? proposals : []).map(proposal => this.buildPlan(proposal)).filter(Boolean);
  }

  buildPlan(proposal = {}) {
    const normalized = proposal instanceof LearnedAdaptationArtifact ? proposal.proposal : proposal;
    const targetSurface = normalized.targetSurface || 'runtime';
    const category = normalized.category || 'general';
    const changeType = normalized.changeType || 'runtime_adjustment';

    const actionTarget = {
      routing: 'routing_policy',
      policy: 'tool_policy',
      decomposition: 'coordination_decomposition',
      coordination: 'coordination_strategy',
      evaluation: 'benchmark_suite',
      runtime: 'runtime_configuration',
    }[targetSurface] || 'runtime_configuration';

    const applyMode =
      category === 'incident' || changeType === 'policy_adjustment' ? 'review_then_apply' : 'apply_after_approval';

    return {
      proposalId: normalized.id || null,
      category,
      targetSurface,
      actionTarget,
      changeType,
      applyMode,
      rationale: normalized.rationale || null,
      steps: this._buildSteps(normalized, actionTarget),
      rollback: this.buildRollbackPlan(normalized),
      evidence: normalized.evidence || {},
    };
  }

  compareArtifacts(left = {}, right = {}) {
    const leftArtifact = left instanceof LearnedAdaptationArtifact ? left : LearnedAdaptationArtifact.fromJSON(left);
    const rightArtifact = right instanceof LearnedAdaptationArtifact ? right : LearnedAdaptationArtifact.fromJSON(right);
    const diff = leftArtifact.diff(rightArtifact);

    return {
      left: leftArtifact.summarize(),
      right: rightArtifact.summarize(),
      diff,
      changed: diff.evidenceChanged || diff.recommendationChanged || diff.rollbackChanged,
    };
  }

  buildRollbackPlan(proposal = {}) {
    const normalized = proposal instanceof LearnedAdaptationArtifact ? proposal.proposal : proposal;
    return {
      proposalId: normalized.id || null,
      action: normalized.rollback?.action || 'restore_prior_configuration',
      reason: normalized.rollback?.reason || 'Revert the learned change if measured outcomes regress.',
      prerequisites: [
        'replay the baseline evidence',
        'compare post-change outcomes against the prior baseline',
      ],
    };
  }

  _buildSteps(proposal = {}, actionTarget = 'runtime_configuration') {
    const summary = proposal.recommendedChange?.summary || proposal.rationale || 'Apply governed improvement.';
    const actions = Array.isArray(proposal.recommendedChange?.actions) ? proposal.recommendedChange.actions : [];

    const steps = [
      {
        id: `${proposal.id || 'proposal'}:review`,
        type: 'review',
        target: actionTarget,
        summary,
      },
    ];

    for (const [index, action] of actions.entries()) {
      steps.push({
        id: `${proposal.id || 'proposal'}:apply:${index + 1}`,
        type: 'apply',
        target: actionTarget,
        summary: action,
      });
    }

    if (!actions.length) {
      steps.push({
        id: `${proposal.id || 'proposal'}:apply:1`,
        type: 'apply',
        target: actionTarget,
        summary,
      });
    }

    return steps;
  }
}

module.exports = { ImprovementActionPlanner };
