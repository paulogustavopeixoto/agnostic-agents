const {
  Run,
  Memory,
  MemoryProvenanceLedger,
  MemoryAccessContractRegistry,
  StateBundle,
  StateBundleSerializer,
  StateContractRegistry,
  StateConsistencyChecker,
  StateDiff,
  StateIntegrityChecker,
} = require('../index');

async function main() {
  const run = new Run({
    input: 'Bundle this state.',
    status: 'completed',
    state: {
      assessment: {
        confidence: 0.91,
      },
      retrieval: {
        hits: 2,
      },
    },
    messages: [
      { role: 'user', content: 'Bundle this state.' },
      { role: 'assistant', content: 'State bundle ready.' },
    ],
    toolCalls: [
      {
        name: 'search_docs',
        arguments: { query: 'state bundle' },
      },
    ],
  });
  run.addCheckpoint({
    id: `${run.id}:checkpoint:1`,
    label: 'run_completed',
    status: 'completed',
    snapshot: run.createCheckpointSnapshot(),
  });

  const memory = new Memory({
    governance: {
      provenanceLedger: new MemoryProvenanceLedger(),
    },
  });
  await memory.setWorkingMemory('active_task', 'state-bundle-demo', {
    metadata: { source: 'runtime' },
    context: { actor: 'runtime', trustZone: 'internal' },
  });
  await memory.setPolicy('rollout_mode', 'draft', {
    metadata: { source: 'governance' },
    context: { actor: 'governance', trustZone: 'internal' },
  });
  const accessContracts = new MemoryAccessContractRegistry();
  const governedState = memory.exportGovernedState({ accessContracts });

  const bundle = new StateBundle({
    run,
    memory: governedState.layers,
    memoryGovernance: governedState.governance,
    metadata: {
      purpose: 'state-os-demo',
      jobs: [
        {
          id: 'state-demo-job',
          runId: run.id,
          status: 'scheduled',
          handler: 'reconcile_state',
        },
      ],
    },
  });

  const exported = bundle.toJSON();
  const restored = StateBundleSerializer.import(exported);
  const contractRegistry = new StateContractRegistry();
  const integrityChecker = new StateIntegrityChecker({
    contractRegistry,
  });
  const consistencyChecker = new StateConsistencyChecker();
  const evolved = new StateBundle({
    run: new Run({
      ...run.toJSON(),
      status: 'failed',
      state: {
        ...run.state,
        recovery: {
          required: true,
        },
        scheduler: {
          jobId: 'state-demo-job',
        },
      },
      metadata: {
        ...run.metadata,
        jobId: 'state-demo-job',
      },
    }),
    memory: {
      ...restored.memory,
      working: {
        active_task: 'Bundle this state.',
      },
      semantic: {
        last_incident: 'state-drift',
      },
    },
    memoryGovernance: restored.memoryGovernance,
    metadata: {
      ...restored.metadata,
      variant: 'failed',
    },
  });

  console.log('State bundle summary:');
  console.dir(restored.summarize(), { depth: null });

  console.log('\nState contract summary:');
  console.dir(contractRegistry.describe('state_bundle'), { depth: null });

  console.log('\nState integrity report:');
  console.dir(integrityChecker.check(exported), { depth: null });

  console.log('\nState consistency report:');
  console.dir(consistencyChecker.check(evolved), { depth: null });

  console.log('\nState diff summary:');
  console.dir(StateDiff.diff(restored, evolved), { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
