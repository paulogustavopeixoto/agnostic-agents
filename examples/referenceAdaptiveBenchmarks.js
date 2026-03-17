const {
  EvalHarness,
  LearningLoop,
  PolicyTuningAdvisor,
  HistoricalRoutingAdvisor,
  AdaptiveDecisionLedger,
  AdaptiveGovernanceGate,
  ApprovalInbox,
} = require('../index');

async function main() {
  const learningLoop = new LearningLoop();
  learningLoop.recordRun({
    id: 'run-low-confidence',
    status: 'completed',
    errors: [],
    toolCalls: [],
    toolResults: [],
    state: {
      assessment: {
        confidence: 0.45,
        evidenceConflicts: 1,
      },
      selfVerification: {
        action: 'require_approval',
      },
    },
    pendingApproval: { toolName: 'send_status_update' },
  });

  const routingAdvisor = new HistoricalRoutingAdvisor({ learningLoop });
  routingAdvisor.recordOutcome({
    providerLabel: 'safe-provider',
    success: true,
    methodName: 'generateText',
    taskType: 'support',
    confidence: 0.92,
  });
  routingAdvisor.recordOutcome({
    providerLabel: 'safe-provider',
    success: true,
    methodName: 'generateText',
    taskType: 'support',
    confidence: 0.88,
  });
  routingAdvisor.recordOutcome({
    providerLabel: 'risky-provider',
    success: false,
    methodName: 'generateText',
    taskType: 'support',
    confidence: 0.31,
  });

  const providerCandidates = [
    {
      provider: { name: 'risky-provider' },
      profile: { labels: ['risky-provider'], taskTypes: ['support'], riskTier: 'high' },
    },
    {
      provider: { name: 'safe-provider' },
      profile: { labels: ['safe-provider'], taskTypes: ['support'], riskTier: 'medium' },
    },
  ];

  const branchAnalysis = {
    baselineRunId: 'baseline-run',
    bestRunId: 'replay-run',
    comparisons: [
      {
        runId: 'replay-run',
        diff: {
          firstDivergingStepIndex: 1,
        },
      },
    ],
  };

  const policyAdvisor = new PolicyTuningAdvisor({ learningLoop });
  const adaptiveGate = new AdaptiveGovernanceGate({
    ledger: new AdaptiveDecisionLedger(),
    approvalInbox: new ApprovalInbox(),
  });

  const harness = new EvalHarness({
    scenarios: [
      {
        id: 'adaptive-routing-benchmark',
        run: async () =>
          routingAdvisor.rankProviders(providerCandidates, {
            methodName: 'generateText',
            args: [{}, { route: { taskType: 'support' } }],
          }),
        assert: ranked => ranked[0].provider.name === 'safe-provider',
      },
      {
        id: 'adaptive-policy-suggestion-benchmark',
        run: async () => policyAdvisor.buildSuggestions({ branchAnalysis }),
        assert: suggestions =>
          suggestions.some(
            suggestion =>
              suggestion.id === 'tighten-side-effect-policy' ||
              suggestion.id === 'promote-healthier-branch-baseline'
          ),
      },
      {
        id: 'adaptive-governance-benchmark',
        run: async () =>
          adaptiveGate.reviewSuggestion(
            {
              id: 'adaptive-routing-review',
              category: 'routing_policy',
              priority: 'high',
              suggestion: 'Promote replay-run as the support routing baseline.',
              evidence: { bestRunId: 'replay-run' },
            },
            {
              replay: { baselineRunId: 'baseline-run', bestRunId: 'replay-run' },
              rollback: { action: 'restore_baseline', runId: 'baseline-run' },
            }
          ),
        assert: result =>
          result.action === 'require_approval' &&
          result.request?.adaptiveEntryId === 'adaptive-routing-review',
      },
    ],
  });

  const report = await harness.run({ learningLoop });
  console.log('Adaptive benchmark report:');
  console.dir(report, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
