const {
  ExtensionHost,
  ProductionPolicyPack,
  Tool,
} = require('../index');

async function main() {
  const pack = new ProductionPolicyPack({
    environment: 'production',
    denyToolNames: ['delete_records'],
    protectedToolNames: ['send_status_update'],
    requireApprovalTags: ['pii'],
  });

  const host = new ExtensionHost({
    extensions: [pack.toExtension()],
  });
  const policy = host.extendToolPolicy();
  const governanceHooks = host.extendGovernanceHooks();

  const deleteTool = new Tool({
    name: 'delete_records',
    parameters: { type: 'object', properties: {} },
    implementation: async () => ({ ok: true }),
  });
  const sendUpdateTool = new Tool({
    name: 'send_status_update',
    parameters: { type: 'object', properties: {} },
    implementation: async () => ({ ok: true }),
  });
  const syncProfileTool = new Tool({
    name: 'sync_profile',
    parameters: { type: 'object', properties: {} },
    metadata: { tags: ['pii'] },
    implementation: async () => ({ ok: true }),
  });

  console.log('Production policy decisions:');
  console.dir(
    {
      delete_records: policy.evaluate(deleteTool, {}, {}),
      send_status_update: policy.evaluate(sendUpdateTool, {}, {}),
      sync_profile: policy.evaluate(syncProfileTool, {}, {}),
    },
    { depth: null }
  );

  await governanceHooks.dispatch(
    'approval_requested',
    {
      runId: 'production-run-1',
      toolName: 'send_status_update',
    },
    {
      run: { id: 'production-run-1' },
    }
  );

  console.log('\nGovernance events captured by pack:');
  console.dir(pack.listGovernanceEvents(), { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
