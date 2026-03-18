const {
  CompensationPolicyPlanner,
  PolicyPack,
} = require('../index');

async function main() {
  const planner = new CompensationPolicyPlanner({
    policyPack: new PolicyPack({
      id: 'compensation-policy-pack',
      name: 'compensation-policy-pack',
      version: '1.0.0',
      rules: [
        {
          id: 'require-approval-for-external-write-compensation',
          sideEffectLevels: ['external_write'],
          action: 'require_approval',
          reason: 'Compensating external writes must be approved.',
        },
        {
          id: 'allow-internal-cleanup-compensation',
          sideEffectLevels: ['internal_write'],
          action: 'allow',
          reason: 'Internal cleanup compensation can run automatically.',
        },
      ],
    }),
  });

  const entries = [
    {
      toolName: 'send_status_update',
      stepId: 'notify-user',
      sideEffectLevel: 'external_write',
      compensationHandler: true,
      reason: 'Undo the external notification.',
    },
    {
      toolName: 'cache_temp_record',
      stepId: 'cache-temp',
      sideEffectLevel: 'internal_write',
      compensationHandler: true,
      reason: 'Clear the temporary cache entry.',
    },
  ];

  const plan = planner.plan(entries, {
    runId: 'compensation-run-1',
  });
  const record = planner.createEvaluationRecord(entries, {
    runId: 'compensation-run-1',
  });

  console.log('Compensation policy plan summary:');
  console.dir(
    {
      recommendedAction: plan.recommendedAction,
      approvalsRequired: plan.summary.approvalsRequired,
      autoCompensate: plan.summary.autoCompensate,
      items: plan.items.map(item => ({
        stepId: item.entry.stepId,
        policyAction: item.policyDecision.action,
        recommendedAction: item.recommendedAction,
      })),
    },
    { depth: null }
  );

  console.log('\nCompensation policy evaluation artifact:');
  console.dir(record.summarize(), { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
