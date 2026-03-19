const {
  LearningLoop,
  Run,
  ImprovementProposalEngine,
  GovernedImprovementLoop,
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
  const ledger = new AdaptiveDecisionLedger();
  const loop = new GovernedImprovementLoop({
    proposalEngine,
    ledger,
    governanceGate: {
      approvalInbox: new ApprovalInbox(),
    },
  });

  const artifacts = proposalEngine.exportArtifacts();
  const review = await loop.review();

  console.log('Governed improvement summary:');
  console.dir(
    {
      artifacts,
      review,
    },
    { depth: null }
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
