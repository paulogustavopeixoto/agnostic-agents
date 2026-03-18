const {
  PolicyPack,
  RecoveryPolicyGate,
} = require('../index');

async function main() {
  const gate = new RecoveryPolicyGate({
    policyPack: new PolicyPack({
      id: 'recovery-policy-pack',
      name: 'recovery-policy-pack',
      version: '1.0.0',
      rules: [
        {
          id: 'require-review-for-branch-recovery',
          toolNames: ['recovery:branch_from_failure_checkpoint'],
          action: 'require_approval',
          reason: 'Branch recovery must be approved before execution.',
        },
        {
          id: 'allow-partial-replay',
          toolNames: ['recovery:partial_replay'],
          action: 'allow',
          reason: 'Partial replay is allowed for deterministic inspection.',
        },
      ],
    }),
  });

  const plan = {
    runId: 'recovery-run-1',
    incidentType: 'tool_failure',
    recommendedAction: 'branch_from_failure_checkpoint',
    steps: [
      {
        action: 'branch_from_failure_checkpoint',
        priority: 'high',
        reason: 'Retry from the failure boundary.',
        requiresApproval: true,
      },
      {
        action: 'partial_replay',
        priority: 'medium',
        reason: 'Inspect the latest checkpoint before retrying.',
        requiresApproval: false,
      },
    ],
  };

  const evaluation = gate.evaluatePlan(plan);
  const record = gate.createEvaluationRecord(plan);

  console.log('Recovery policy gate summary:');
  console.dir(
    {
      recommendedAction: evaluation.recommendedAction,
      blocked: evaluation.summary.blocked,
      allowed: evaluation.summary.allowed,
      actions: evaluation.evaluations.map(item => ({
        step: item.step.action,
        policyAction: item.policyDecision.action,
        gatedAction: item.gatedAction,
      })),
    },
    { depth: null }
  );

  console.log('\nRecovery policy evaluation artifact:');
  console.dir(record.summarize(), { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
