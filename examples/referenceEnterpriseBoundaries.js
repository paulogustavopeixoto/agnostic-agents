const {
  EnterpriseBoundaryProfile,
  TransactionalExecutionPlan,
} = require('../index');

async function main() {
  const profile = new EnterpriseBoundaryProfile({
    environments: [
      { id: 'staging', dataClass: 'restricted' },
      { id: 'prod', dataClass: 'restricted' },
    ],
    approvalOrganizations: [
      { id: 'ops', role: 'runtime_operator' },
      { id: 'compliance', role: 'risk_review' },
    ],
    externalSystems: [
      { id: 'crm', trustZone: 'private-model-only' },
      { id: 'billing', trustZone: 'sandbox-only' },
    ],
    tenantBoundaries: [
      { id: 'tenant_id', strategy: 'isolate_runs_and_memory' },
    ],
  });

  const validation = profile.validate();
  const transaction = TransactionalExecutionPlan.build([
    {
      id: 'update_crm',
      system: 'crm',
      operation: 'patch_contact_record',
      environment: 'prod',
      requiresApproval: true,
      sideEffectLevel: 'external_write',
      verification: 'crm_read_after_write',
      compensation: {
        operation: 'restore_contact_snapshot',
      },
    },
    {
      id: 'queue_billing_sync',
      system: 'billing',
      operation: 'enqueue_sync_job',
      environment: 'prod',
      requiresApproval: false,
      sideEffectLevel: 'external_write',
      idempotent: true,
      verification: 'job_enqueued',
    },
  ]);

  console.log('Enterprise boundary summary:');
  console.dir(
    {
      validation,
      transaction,
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
