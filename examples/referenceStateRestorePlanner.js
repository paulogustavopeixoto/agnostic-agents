const {
  Run,
  StateBundle,
  StateDurableRestoreSuite,
  StateRestorePlanner,
} = require('../index');

async function main() {
  const run = new Run({
    input: 'Restore this long-running workflow in another environment.',
    status: 'paused',
    state: {
      assessment: {
        confidence: 0.84,
      },
      scheduler: {
        jobId: 'restore-job-1',
      },
    },
    messages: [
      { role: 'user', content: 'Restore this long-running workflow in another environment.' },
    ],
    steps: [
      {
        id: 'workflow-step-1',
        type: 'workflow_step',
        status: 'paused',
      },
    ],
    pendingPause: {
      stage: 'workflow_replay',
      reason: 'Prepared for remote workflow replay.',
      jobId: 'restore-job-1',
    },
    metadata: {
      jobId: 'restore-job-1',
      workflowId: 'workflow-restore-1',
      lineage: {
        rootRunId: 'restore-root',
        parentRunId: null,
        childRunIds: [],
        branchOriginRunId: null,
        branchCheckpointId: null,
      },
    },
  });
  run.addCheckpoint({
    id: `${run.id}:checkpoint:1`,
    label: 'workflow_paused',
    status: 'paused',
    snapshot: run.createCheckpointSnapshot(),
  });

  const bundle = new StateBundle({
    run,
    memory: {
      working: {
        active_task: 'restore this long-running workflow in another environment',
      },
      semantic: {
        last_incident: 'worker-restart-during-workflow',
      },
    },
    metadata: {
      purpose: 'cross-environment-restore-demo',
      jobs: [
        {
          id: 'restore-job-1',
          runId: run.id,
          status: 'scheduled',
          handler: 'resume_workflow',
        },
      ],
    },
  });

  const planner = new StateRestorePlanner();
  const durableSuite = new StateDurableRestoreSuite();
  const plan = planner.buildPlan(bundle, {
    sourceEnvironment: 'api-service',
    targetEnvironment: 'worker-service',
  });
  const durableScenarios = durableSuite.build(bundle, {
    sourceEnvironment: 'api-service',
  });

  console.log('State restore plan summary:');
  console.dir(
    {
      readyToRestore: plan.readyToRestore,
      sourceEnvironment: plan.sourceEnvironment,
      targetEnvironment: plan.targetEnvironment,
      actions: plan.steps.map(step => ({
        action: step.action,
        status: step.status,
      })),
    },
    { depth: null }
  );

  console.log('\nState restore plan details:');
  console.dir(plan, { depth: null });

  console.log('\nDurable restore scenarios:');
  console.dir(durableScenarios, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
