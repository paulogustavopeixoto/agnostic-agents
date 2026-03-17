const {
  Run,
  EvalHarness,
  LearningLoop,
  BranchQualityAnalyzer,
  PolicyTuningAdvisor,
  VerifierEnsemble,
  ConfidencePolicy,
  AdaptiveRetryPolicy,
  HistoricalRoutingAdvisor,
  AdaptiveDecisionLedger,
  AdaptiveGovernanceGate,
  ApprovalInbox,
  GovernanceHooks,
} = require('../index');

function buildRun({
  id,
  status = 'completed',
  output = 'ok',
  confidence = 0.8,
  verification = 'allow',
  evidenceConflicts = 0,
  errors = [],
  pendingApproval = null,
  pendingPause = null,
} = {}) {
  return new Run({
    id,
    input: `input:${id}`,
    status,
    output,
    errors,
    pendingApproval,
    pendingPause,
    state: {
      assessment: {
        confidence,
        evidenceConflicts,
        verification: {
          action: verification,
          reason: verification === 'allow' ? 'healthy path' : 'review needed',
        },
      },
      selfVerification: {
        action: verification,
        reason: verification === 'allow' ? 'healthy path' : 'review needed',
      },
    },
  });
}

async function main() {
  console.log('=== v7 Audit: Learning, Adaptation, and Governance ===');

  const learningLoop = new LearningLoop();
  learningLoop.recordRun({
    id: 'run-low-confidence',
    status: 'completed',
    errors: [],
    toolCalls: [],
    toolResults: [],
    state: {
      assessment: {
        confidence: 0.46,
        evidenceConflicts: 1,
      },
      selfVerification: {
        action: 'require_approval',
      },
    },
    pendingApproval: { toolName: 'send_status_update' },
  });
  learningLoop.recordRun({
    id: 'run-failed',
    status: 'failed',
    errors: [{ name: 'Error', message: 'provider timeout' }],
    toolCalls: [],
    toolResults: [],
    state: {
      assessment: {
        confidence: 0.4,
        evidenceConflicts: 0,
      },
      selfVerification: {
        action: 'deny',
      },
    },
  });
  learningLoop.recordEvaluation({
    total: 2,
    passed: 1,
    failed: 1,
    results: [
      { id: 'adaptive-routing-benchmark', passed: true, durationMs: 1, error: null },
      { id: 'adaptive-governance-benchmark', passed: false, durationMs: 1, error: 'approval missing' },
    ],
  });

  console.log('\nLearning summary:');
  console.dir(learningLoop.summarize(), { depth: null });

  console.log('\nAdaptive recommendations:');
  console.dir(learningLoop.buildAdaptiveRecommendations(), { depth: null });

  const baselineRun = buildRun({
    id: 'baseline-run',
    status: 'completed',
    confidence: 0.51,
    verification: 'require_approval',
    evidenceConflicts: 1,
    pendingApproval: { reason: 'needs review' },
  });
  const replayRun = buildRun({
    id: 'replay-run',
    status: 'completed',
    confidence: 0.91,
    verification: 'allow',
    evidenceConflicts: 0,
  });
  const branchRun = buildRun({
    id: 'branch-run',
    status: 'paused',
    output: null,
    confidence: 0.63,
    verification: 'allow',
    pendingPause: { stage: 'confidence_review' },
  });

  const branchAnalyzer = new BranchQualityAnalyzer();
  const branchAnalysis = branchAnalyzer.compare(baselineRun, [replayRun, branchRun]);

  console.log('\nBranch quality analysis:');
  console.dir(branchAnalysis, { depth: null });

  const policyAdvisor = new PolicyTuningAdvisor({ learningLoop });
  console.log('\nPolicy tuning suggestions:');
  console.dir(policyAdvisor.buildSuggestions({ branchAnalysis }), { depth: null });

  const ensemble = new VerifierEnsemble({
    strategy: 'escalate_on_disagreement',
    reviewers: [
      async () => ({ action: 'allow', reason: 'Primary reviewer allowed.' }),
      async () => ({ action: 'require_approval', reason: 'Secondary reviewer wants operator review.' }),
    ],
  });
  console.log('\nVerifier ensemble verdict:');
  console.dir(await ensemble.verify({ name: 'send_status_update' }, { recipient: 'Paulo' }), { depth: null });

  const confidencePolicy = new ConfidencePolicy({
    toolApprovalThreshold: 0.8,
    runPauseThreshold: 0.65,
  });
  console.log('\nConfidence policy decisions:');
  console.dir(
    {
      tool: confidencePolicy.evaluateTool(
        { metadata: { sideEffectLevel: 'external_write' } },
        { score: 0.55 },
        {}
      ),
      run: confidencePolicy.evaluateRun({}, { confidence: 0.5 }, {}),
    },
    { depth: null }
  );

  const adaptiveRetryPolicy = new AdaptiveRetryPolicy({
    learningLoop,
    escalateAfterAttempt: 0,
  });
  console.log('\nAdaptive retry decision:');
  console.dir(
    adaptiveRetryPolicy.onFailure(new Error('tool failure'), {
      attempt: 0,
      retries: 2,
      context: {
        operation: 'tool_execution',
        sideEffectLevel: 'external_write',
      },
    }),
    { depth: null }
  );

  const routingAdvisor = new HistoricalRoutingAdvisor({ learningLoop });
  routingAdvisor.recordOutcome({
    providerLabel: 'safe-provider',
    success: true,
    methodName: 'generateText',
    taskType: 'support',
    confidence: 0.93,
  });
  routingAdvisor.recordOutcome({
    providerLabel: 'risky-provider',
    success: false,
    methodName: 'generateText',
    taskType: 'support',
    confidence: 0.32,
  });
  const rankedProviders = routingAdvisor.rankProviders(
    [
      {
        provider: { name: 'risky-provider' },
        profile: { labels: ['risky-provider'], taskTypes: ['support'], riskTier: 'high' },
      },
      {
        provider: { name: 'safe-provider' },
        profile: { labels: ['safe-provider'], taskTypes: ['support'], riskTier: 'medium' },
      },
    ],
    {
      methodName: 'generateText',
      args: [{}, { route: { taskType: 'support' } }],
    }
  );

  console.log('\nHistorical routing ranking:');
  console.dir(
    rankedProviders.map(item => ({
      provider: item.provider.name,
      riskTier: item.profile.riskTier,
    })),
    { depth: null }
  );

  const governanceEvents = [];
  const ledger = new AdaptiveDecisionLedger();
  const gate = new AdaptiveGovernanceGate({
    ledger,
    approvalInbox: new ApprovalInbox(),
    governanceHooks: new GovernanceHooks({
      onEvent: async type => {
        governanceEvents.push(type);
      },
    }),
  });

  const review = await gate.reviewSuggestion(
    {
      id: 'adaptive-routing-review',
      category: 'routing_policy',
      priority: 'high',
      suggestion: 'Promote replay-run as the routing baseline.',
      evidence: { bestRunId: 'replay-run' },
    },
    {
      replay: { baselineRunId: 'baseline-run', bestRunId: 'replay-run' },
      rollback: { action: 'restore_baseline', runId: 'baseline-run' },
    }
  );
  const resolution = await gate.resolveReview(review.request.reviewId, {
    approved: true,
    applied: true,
    reason: 'Approved in v7 audit.',
  });

  console.log('\nAdaptive governance review:');
  console.dir({ review, resolution, governanceEvents }, { depth: null });

  const benchmarkHarness = new EvalHarness({
    scenarios: [
      {
        id: 'adaptive-routing-benchmark',
        run: async () => rankedProviders,
        assert: result => result[0].provider.name === 'safe-provider',
      },
      {
        id: 'adaptive-policy-benchmark',
        run: async () => policyAdvisor.buildSuggestions({ branchAnalysis }),
        assert: result => result.some(item => item.id === 'promote-healthier-branch-baseline'),
      },
      {
        id: 'adaptive-governance-benchmark',
        run: async () => review,
        assert: result => result.action === 'require_approval',
      },
    ],
  });

  console.log('\nAdaptive benchmark report:');
  console.dir(await benchmarkHarness.run({ learningLoop }), { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
