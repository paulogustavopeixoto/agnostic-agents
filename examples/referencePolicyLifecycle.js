const {
  PolicyLifecycleManager,
  PolicyPack,
} = require('../index');

async function main() {
  const baseline = new PolicyPack({
    id: 'ops-policy',
    name: 'ops-policy',
    version: '1.0.0',
    rules: [
      {
        id: 'approval-write',
        sideEffectLevels: ['external_write'],
        action: 'require_approval',
      },
    ],
  });

  const draft = new PolicyPack({
    id: 'ops-policy',
    name: 'ops-policy',
    version: '1.1.0',
    rules: [
      {
        id: 'approval-write',
        sideEffectLevels: ['external_write'],
        action: 'require_approval',
      },
      {
        id: 'deny-destructive',
        sideEffectLevels: ['destructive'],
        action: 'deny',
      },
    ],
  });

  const lifecycle = new PolicyLifecycleManager({
    active: baseline,
  });
  lifecycle.setDraft(draft);

  const promotion = lifecycle.promote(undefined, {
    reason: 'Promote tested destructive-action guardrails.',
  });

  const rollback = lifecycle.rollback({
    version: '1.0.0',
    reason: 'Restore the baseline after rollout review.',
  });

  console.log('Policy lifecycle summary:');
  console.dir(lifecycle.summarize(), { depth: null });

  console.log('\nPolicy promotion result:');
  console.dir(
    {
      activeVersion: promotion.active.version,
      previousVersion: promotion.previousActive?.version || null,
      reason: promotion.metadata.reason,
    },
    { depth: null }
  );

  console.log('\nPolicy rollback result:');
  console.dir(
    {
      activeVersion: rollback.active.version,
      rolledBackFrom: rollback.rolledBackFrom?.version || null,
      reason: rollback.metadata.reason,
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
