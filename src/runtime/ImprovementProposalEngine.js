const { LearningLoop } = require('./LearningLoop');
const { LearnedAdaptationArtifact } = require('./LearnedAdaptationArtifact');

class ImprovementProposalEngine {
  constructor({ learningLoop = null } = {}) {
    this.learningLoop =
      learningLoop instanceof LearningLoop ? learningLoop : new LearningLoop(learningLoop || {});
  }

  buildProposals({ branchComparison = null, incident = null } = {}) {
    const adaptiveRecommendations = this.learningLoop.buildAdaptiveRecommendations();
    const proposals = adaptiveRecommendations.map(recommendation =>
      this._recommendationToProposal(recommendation)
    );

    if (branchComparison) {
      proposals.push(this._branchComparisonToProposal(branchComparison));
    }

    if (incident) {
      proposals.push(this._incidentToProposal(incident));
    }

    return proposals.filter(Boolean);
  }

  exportArtifacts(options = {}) {
    return this.buildProposals(options).map(proposal =>
      new LearnedAdaptationArtifact({
        proposal,
        metadata: {
          source: 'improvement_proposal_engine',
        },
      }).toJSON()
    );
  }

  _recommendationToProposal(recommendation = {}) {
    const mapping = {
      evaluation: { changeType: 'routing_adjustment', targetSurface: 'routing' },
      governance: { changeType: 'policy_adjustment', targetSurface: 'policy' },
      routing: { changeType: 'retrieval_or_routing_adjustment', targetSurface: 'routing' },
      operations: { changeType: 'tooling_or_decomposition_adjustment', targetSurface: 'decomposition' },
      benchmarking: { changeType: 'benchmark_expansion', targetSurface: 'evaluation' },
    }[recommendation.category || 'benchmarking'] || {
      changeType: 'runtime_adjustment',
      targetSurface: 'runtime',
    };

    return {
      id: `improvement:${recommendation.id || recommendation.category || 'proposal'}`,
      category: recommendation.category || 'general',
      priority: recommendation.priority || 'medium',
      changeType: mapping.changeType,
      targetSurface: mapping.targetSurface,
      rationale: recommendation.reason || null,
      evidence: recommendation.evidence || {},
      recommendedChange: {
        summary: recommendation.suggestedActions?.[0] || recommendation.reason || null,
        actions: [...(recommendation.suggestedActions || [])],
      },
      rollback: {
        action: 'restore_prior_configuration',
        reason: 'Rollback to the last stable configuration if the learned change degrades outcomes.',
      },
    };
  }

  _branchComparisonToProposal(branchComparison = {}) {
    return {
      id: `improvement:branch:${branchComparison.rootRunId || 'comparison'}`,
      category: 'branch_comparison',
      priority: 'medium',
      changeType: 'branch_quality_adjustment',
      targetSurface: 'coordination',
      rationale: 'Branch comparison indicates a better or worse path worth turning into an explicit proposal.',
      evidence: branchComparison,
      recommendedChange: {
        summary: 'Prefer the stronger replay branch characteristics in future routing or coordination.',
        actions: ['Review the higher-quality branch and convert its differences into routing or verifier changes.'],
      },
      rollback: {
        action: 'restore_prior_branch_preference',
        reason: 'Restore the prior preferred branch heuristics if new changes increase regressions.',
      },
    };
  }

  _incidentToProposal(incident = {}) {
    return {
      id: `improvement:incident:${incident.runId || incident.id || 'incident'}`,
      category: 'incident',
      priority: 'high',
      changeType: 'incident_driven_adjustment',
      targetSurface: 'policy',
      rationale: 'A reconstructed incident should be reviewable as a concrete improvement proposal.',
      evidence: incident,
      recommendedChange: {
        summary: 'Convert the incident findings into a governed runtime or coordination change.',
        actions: ['Review the incident evidence and tighten policy, routing, or verifier behavior for the failing path.'],
      },
      rollback: {
        action: 'restore_prior_incident_policy',
        reason: 'Revert the incident-driven change if it causes wider regressions.',
      },
    };
  }
}

module.exports = { ImprovementProposalEngine };
