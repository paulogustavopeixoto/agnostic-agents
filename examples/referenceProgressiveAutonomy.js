const {
  Workflow,
  WorkflowStep,
  WorkflowRunner,
  WorkflowSupervisionCheckpoint,
  AutonomyEnvelope,
  ProgressiveAutonomyController,
} = require('../index');

async function main() {
  const checkpoint = new WorkflowSupervisionCheckpoint({
    requireReviewBelowConfidence: 0.75,
    escalateBelowConfidence: 0.55,
  });

  const workflow = new Workflow({
    id: 'supervised-release-workflow',
    steps: [
      new WorkflowStep({
        id: 'draft_release_note',
        run: async ({ pause }) => {
          const decision = checkpoint.evaluate({
            workflowId: 'supervised-release-workflow',
            stepId: 'draft_release_note',
            taskFamily: 'release_review',
            riskClass: 'high',
            confidence: 0.61,
            rationale: 'The release summary mentions a production config change without explicit rollback notes.',
            alternatives: [
              'Request operator review before distribution.',
              'Regenerate the summary with explicit rollback instructions.',
            ],
          });

          if (decision.requiresPause) {
            await pause('supervised_checkpoint', decision.checkpoint);
          }

          return { distributed: false };
        },
      }),
    ],
  });

  const runner = new WorkflowRunner({ workflow });
  const pausedRun = await runner.run('Prepare the production release summary.');

  const baseEnvelope = new AutonomyEnvelope({
    budget: {
      spend: 4,
      toolCalls: 2,
      tokens: 800,
    },
    supervisionPolicy: {
      reviewThreshold: 0.7,
      escalateThreshold: 0.5,
    },
    environment: 'prod',
    tenant: 'acme',
  });

  const controller = new ProgressiveAutonomyController({
    minimumEvidenceScore: 0.8,
    widenIncrement: { spend: 2, toolCalls: 1, tokens: 400 },
    tightenIncrement: { spend: 1, toolCalls: 1, tokens: 200 },
  });

  const widened = controller.adjust(baseEnvelope, {
    evidenceScore: 0.91,
    environment: 'prod',
    tenant: 'acme',
    reason: 'three successful supervised runs',
  });

  const tightened = controller.adjust(baseEnvelope, {
    evidenceScore: 0.42,
    environment: 'prod',
    tenant: 'acme',
    reason: 'recent escalation and budget overrun',
  });

  console.log('Progressive autonomy summary');
  console.dir(
    {
      pausedRunStatus: pausedRun.status,
      pendingPause: pausedRun.pendingPause,
      widened,
      tightened,
    },
    { depth: null }
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
