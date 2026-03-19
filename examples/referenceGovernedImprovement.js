const {
  LearningLoop,
  Run,
  ImprovementProposalEngine,
  ImprovementActionPlanner,
  GovernedImprovementLoop,
  AdaptationPolicyEnvelope,
  LearningBenchmarkSuite,
  AdaptationRegressionGuard,
  AdaptiveDecisionLedger,
  ApprovalInbox,
} = require('../index');

async function main() {
  const learningLoop = new LearningLoop();
  learningLoop.recordRun(
    new Run({
      input: 'risky release summary',
      status: 'failed',
      pendingApproval: { toolName: 'send_status_update' },
      state: {
        assessment: {
          confidence: 0.41,
          evidenceConflicts: 1,
        },
        selfVerification: {
          action: 'require_approval',
        },
      },
    })
  );
  learningLoop.recordEvaluation({
    total: 1,
    passed: 0,
    failed: 1,
    results: [
      {
        id: 'routing-regression',
        passed: false,
        category: 'routing',
        error: 'retrieval grounding failed',
      },
    ],
  });

  const proposalEngine = new ImprovementProposalEngine({ learningLoop });
  const actionPlanner = new ImprovementActionPlanner();
  const ledger = new AdaptiveDecisionLedger();
  const loop = new GovernedImprovementLoop({
    proposalEngine,
    actionPlanner,
    ledger,
    adaptationEnvelope: new AdaptationPolicyEnvelope({
      allowedTargetSurfaces: ['routing', 'policy'],
      deniedChangeTypes: ['benchmark_expansion'],
      requireApprovalCategories: ['evaluation', 'governance', 'incident'],
    }),
    governanceGate: {
      approvalInbox: new ApprovalInbox(),
    },
  });

  const branchComparison = { rootRunId: 'run-root-1', strongestBranchId: 'run-branch-2' };
  const incident = { runId: 'incident-run-1', type: 'grounding_failure' };
  const artifacts = proposalEngine.exportArtifacts({ branchComparison, incident });
  const actionPlans = loop.buildActionPlans({ branchComparison, incident });
  const comparison = actionPlanner.compareArtifacts(artifacts[0], artifacts[artifacts.length - 1]);
  const review = await loop.review({ branchComparison, incident });
  const effect = loop.recordOutcome({
    proposalId: artifacts[0]?.proposal?.id,
    baseline: {
      averageConfidence: 0.41,
      failedEvaluations: 1,
    },
    outcome: {
      averageConfidence: 0.67,
      failedEvaluations: 0,
    },
    summary: 'Routing adjustment reduced failures after review.',
  });
  const regressedEffect = loop.recordOutcome({
    proposalId: 'improvement:regressed-route',
    baseline: {
      averageConfidence: 0.68,
      failedEvaluations: 0,
    },
    outcome: {
      averageConfidence: 0.52,
      failedEvaluations: 1,
    },
    summary: 'An overly aggressive route regressed after rollout.',
  });
  const benchmarkSuite = new LearningBenchmarkSuite({
    effectTracker: loop.effectTracker,
  });
  const benchmarkReport = await benchmarkSuite.run();
  const regressionGuard = new AdaptationRegressionGuard({
    effectTracker: loop.effectTracker,
  });
  const guardDecision = regressionGuard.evaluate();

  console.log('Governed improvement summary:');
  console.dir(
    {
      artifacts,
      actionPlans,
      comparison,
      review,
      effect,
      regressedEffect,
      reviewSummary: loop.summarizeReview(review),
      benchmarkReport,
      guardDecision,
    },
    { depth: null }
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
