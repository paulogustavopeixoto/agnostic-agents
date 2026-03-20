const {
  Memory,
  MemoryProvenanceLedger,
  MemoryRetentionPolicy,
  MemoryAccessController,
  MemoryConflictResolver,
} = require('../index');

async function main() {
  const ledger = new MemoryProvenanceLedger();
  const memory = new Memory({
    governance: {
      provenanceLedger: ledger,
      retentionPolicy: new MemoryRetentionPolicy({
        layerRules: {
          working: { maxAgeMs: 5 },
        },
      }),
      accessController: new MemoryAccessController({
        rules: [
          {
            action: 'read',
            layer: 'policy',
            trustZone: 'public',
            effect: 'deny',
            reason: 'policy_memory_is_private',
          },
        ],
      }),
      conflictResolver: new MemoryConflictResolver({
        trustScores: {
          trusted_system: 0.9,
          untrusted_import: 0.2,
        },
      }),
    },
  });

  await memory.setWorkingMemory('current_task', 'prepare release', {
    metadata: { source: 'trusted_system' },
    context: { actor: 'runtime', trustZone: 'internal' },
  });
  await memory.setPolicy('rollout_policy', 'require approval', {
    metadata: { source: 'trusted_system' },
    context: { actor: 'governance', trustZone: 'internal' },
  });

  await memory.setProfile('account_owner', 'Paulo', {
    metadata: { source: 'trusted_system' },
    context: { actor: 'sync', trustZone: 'internal' },
  });
  await memory.setProfile('account_owner', 'Unknown', {
    metadata: { source: 'untrusted_import' },
    context: { actor: 'importer', trustZone: 'internal' },
  });

  const publicPolicyRead = memory.getPolicy('rollout_policy', {
    actor: 'dashboard',
    trustZone: 'public',
  });

  await new Promise(resolve => setTimeout(resolve, 10));
  memory.enforceRetention();

  console.log('Memory governance summary');
  console.dir(
    {
      working: memory.listWorkingMemory(),
      profile: memory.listProfile(),
      publicPolicyRead,
      audit: memory.getMemoryAudit(),
      governance: memory.summarizeMemoryGovernance(),
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
