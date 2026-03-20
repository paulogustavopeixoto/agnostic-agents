const {
  Memory,
  MemoryProvenanceLedger,
  MemoryAccessController,
  MemoryConflictResolver,
  MemoryAccessContractRegistry,
  MemoryAuditView,
  MemoryGovernanceBenchmarkSuite,
  MemoryGovernanceReviewWorkflow,
  StateBundle,
} = require('../index');

async function main() {
  const memory = new Memory({
    governance: {
      provenanceLedger: new MemoryProvenanceLedger(),
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
          import: 0.2,
        },
      }),
    },
  });

  await memory.setWorkingMemory('active_task', 'review release memory', {
    metadata: { source: 'trusted_system' },
    context: { actor: 'runtime', trustZone: 'internal' },
  });
  await memory.setPolicy('release_policy', 'require approval', {
    metadata: { source: 'trusted_system' },
    context: { actor: 'governance', trustZone: 'internal' },
  });
  await memory.setProfile('owner', 'Paulo', {
    metadata: { source: 'trusted_system' },
    context: { actor: 'sync', trustZone: 'internal' },
  });
  await memory.setProfile('owner', 'Unknown', {
    metadata: { source: 'import' },
    context: { actor: 'importer', trustZone: 'internal' },
  });
  memory.getPolicy('release_policy', {
    actor: 'dashboard',
    trustZone: 'public',
  });

  const accessContracts = new MemoryAccessContractRegistry();
  const governedState = memory.exportGovernedState({ accessContracts });
  const stateBundle = new StateBundle({
    memory: governedState.layers,
    memoryGovernance: governedState.governance,
  }).toJSON();

  const audit = memory.getMemoryAudit();
  const auditSummary = new MemoryAuditView().build({ audit });
  const benchmarkReport = await new MemoryGovernanceBenchmarkSuite().run({
    audit,
    stateBundle,
  });
  const review = new MemoryGovernanceReviewWorkflow().run({
    audit,
    benchmarkReport,
    stateSummary: stateBundle.summary,
  });

  console.log('Memory governance review');
  console.dir(
    {
      auditSummary,
      benchmarkReport,
      review,
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
