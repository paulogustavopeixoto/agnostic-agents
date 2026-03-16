const {
  BackgroundJobScheduler,
  PlanningRuntime,
  InMemoryJobStore,
  InMemoryRunStore,
  RunInspector,
} = require('../index');

async function createWorker() {
  const runStore = new InMemoryRunStore();

  const planningRuntime = new PlanningRuntime({
    runStore,
    planner: async ({ input }) => [
      { id: 'collect', task: `Collect inputs for ${input.topic}` },
      { id: 'summarize', task: `Summarize topic ${input.topic}` },
    ],
    executor: async ({ plan }) => ({
      completed: true,
      planLength: plan.length,
    }),
    verifier: async ({ result }) => ({
      status: result.completed ? 'passed' : 'recover',
      reason: result.completed ? 'background job completed' : 'executor reported incomplete result',
    }),
  });

  const scheduler = new BackgroundJobScheduler({
    store: new InMemoryJobStore(),
    handlers: {
      planning_job: async payload => {
        const run = await planningRuntime.run(payload);
        return {
          runId: run.id,
          summary: RunInspector.summarize(run),
        };
      },
    },
  });

  return { scheduler, planningRuntime, runStore };
}

async function main() {
  const { scheduler } = await createWorker();
  await scheduler.schedule({
    id: 'nightly-runtime-sync',
    handler: 'planning_job',
    payload: { topic: 'runtime-os' },
    runAt: new Date().toISOString(),
    intervalMs: 60_000,
    maxRuns: 1,
  });

  const dueJobs = await scheduler.runDueJobs();
  console.dir(dueJobs, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { createWorker };
