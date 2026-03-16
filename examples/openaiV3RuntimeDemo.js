require('dotenv').config();

const {
  Agent,
  Tool,
  Memory,
  LocalVectorStore,
  RAG,
  OpenAIAdapter,
  InMemoryRunStore,
  InMemoryJobStore,
  Workflow,
  AgentWorkflowStep,
  WorkflowRunner,
  DelegationContract,
  DelegationRuntime,
  PlanningRuntime,
  BackgroundJobScheduler,
  EvalHarness,
  LearningLoop,
  RunInspector,
} = require('../index');

function printSection(title) {
  console.log(`\n=== ${title} ===`);
}

function printEvent(prefix, event) {
  const payload = event.payload ? ` ${JSON.stringify(event.payload)}` : '';
  console.log(`${prefix} ${event.type}${payload}`);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Set OPENAI_API_KEY before running this example.');
    process.exit(1);
  }

  const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY, {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  });

  const memory = new Memory({
    adapter,
    vectorStore: new LocalVectorStore(),
  });
  await memory.setProfile('user_name', 'Paulo');
  await memory.setWorkingMemory('runtime_goal', 'Validate the v3 runtime OS features');
  await memory.setPolicy('high_risk_tools_require_review', 'send_status_update');

  const rag = new RAG({
    adapter,
    vectorStore: new LocalVectorStore(),
    chunkSize: 220,
    chunkOverlap: 20,
    chunkStrategy: 'fixed',
  });

  await rag.index([
    'The v3 runtime supports replay, branching, verifier gating, explicit delegation contracts, and scheduling.',
    'The release is ready for candidate rollout.',
    'The release is not ready for rollout until verification is complete.',
    'Operators should ask for approval before sending an external status update.',
  ]);

  const sendStatusUpdate = new Tool({
    name: 'send_status_update',
    description: 'Send a mock status update.',
    parameters: {
      type: 'object',
      properties: {
        recipient: { type: 'string' },
        summary: { type: 'string' },
      },
      required: ['recipient', 'summary'],
    },
    metadata: {
      executionPolicy: 'require_approval',
      sideEffectLevel: 'external_write',
      verificationPolicy: 'require_verifier',
    },
    implementation: async ({ recipient, summary }) => ({
      delivered: true,
      recipient,
      summary,
      deliveredAt: new Date().toISOString(),
    }),
  });

  const runStore = new InMemoryRunStore();
  const verifier = new OpenAIAdapter(process.env.OPENAI_API_KEY, {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  });

  const operator = new Agent(adapter, {
    tools: [sendStatusUpdate],
    memory,
    rag,
    verifier,
    runStore,
    description:
      'You are a runtime-ops agent. Use retrieved evidence, call tools when explicitly asked, and never claim a tool ran unless it actually ran.',
    defaultConfig: { temperature: 0.2, maxTokens: 500, selfVerify: true },
    onEvent: async event => printEvent('[agent]', event),
  });

  printSection('Agent Run 1: Evidence, Conflict Detection, and Assessment');
  const assessmentRun = await operator.run(
    [
      'Using only the retrieved context, explain whether the release is ready.',
      'Be explicit about conflicting evidence if it exists.',
      'Do not call any tools.',
    ].join('\n')
  );

  console.log('\nAssessment output:');
  console.log(assessmentRun.output);
  console.log('\nAssessment run summary:');
  console.dir(RunInspector.summarize(assessmentRun), { depth: null });

  printSection('Agent Run 2: Approval-Gated Tool Execution');
  const initialRun = await operator.run(
    [
      'You must send a one-line status update now.',
      'Call send_status_update exactly once.',
      'Do not simulate the send in plain text.',
      'After the tool result comes back, provide a one-sentence confirmation.',
      'Recipient: Paulo',
      'Summary: v3 runtime validated with replay, branching, verifier gating, delegation contracts, and scheduling.',
    ].join('\n')
  );

  const completedRun =
    initialRun.status === 'waiting_for_approval'
      ? await operator.resumeRun(initialRun.id, {
          approved: true,
          reason: 'demo approval granted',
        })
      : initialRun;

  if (initialRun.status !== 'waiting_for_approval') {
    console.warn(
      'Warning: the model did not enter the approval-gated tool path. Re-run the demo if you want to observe the tool approval flow.'
    );
  }

  console.log('\nAgent output:');
  console.log(completedRun.output);
  console.log('\nAgent run summary:');
  console.dir(RunInspector.summarize(completedRun), { depth: null });

  const researcher = new Agent(adapter, {
    memory,
    rag,
    verifier,
    description: 'You are a research worker. Be concise and evidence-oriented.',
    defaultConfig: { temperature: 0.2, maxTokens: 300, selfVerify: true },
  });

  const writer = new Agent(adapter, {
    memory,
    verifier,
    description: 'You are a writing worker. Turn research into a crisp update.',
    defaultConfig: { temperature: 0.2, maxTokens: 300, selfVerify: true },
  });

  const delegationRuntime = new DelegationRuntime();
  const workflow = new Workflow({
    id: 'v3-sync-demo',
    name: 'V3 Sync Demo',
    steps: [
      new AgentWorkflowStep({
        id: 'research',
        assignee: 'researcher',
        agent: researcher,
        delegationRuntime,
        delegationContract: new DelegationContract({
          id: 'research-contract',
          assignee: 'researcher',
          requiredInputs: ['prompt'],
        }),
        prompt: () => 'List three concrete v3 runtime capabilities in bullet form.',
      }),
      new AgentWorkflowStep({
        id: 'draft_update',
        dependsOn: ['research'],
        assignee: 'writer',
        agent: writer,
        delegationRuntime,
        delegationContract: new DelegationContract({
          id: 'writer-contract',
          assignee: 'writer',
          requiredInputs: ['prompt'],
        }),
        handoff: {
          from: 'researcher',
          to: 'writer',
          reason: 'Turn findings into a manager-ready update.',
        },
        prompt: ({ dependencyResults }) =>
          `Turn this research into a short status note. Do not claim any external action was taken.\n${dependencyResults.research.output}`,
      }),
    ],
  });

  const workflowRunner = new WorkflowRunner({
    workflow,
    runStore: new InMemoryRunStore(),
    onEvent: async event => printEvent('[workflow]', event),
  });

  printSection('Workflow Run: Delegation Contracts and Child Metrics');
  const workflowRun = await workflowRunner.run('Prepare a v3 status note');
  console.log('\nWorkflow summary:');
  console.dir(workflowRunner.inspectRun(workflowRun), { depth: null });

  printSection('Planning Runtime: Plan, Verify, Recover');
  let firstExecution = true;
  const planningRuntime = new PlanningRuntime({
    planner: async ({ input }) => [
      { id: 'summarize', task: `Summarize: ${input}` },
    ],
    executor: async ({ plan }) => {
      if (firstExecution) {
        firstExecution = false;
        throw new Error(`simulated failure for ${plan[0].id}`);
      }
      return { completed: true, planLength: plan.length };
    },
    verifier: async ({ result }) => ({
      status: result.completed ? 'passed' : 'recover',
      reason: result.completed ? 'looks good' : 'needs recovery',
    }),
    recovery: async ({ error, plan }) => ({
      reason: error ? error.message : 'verification failed',
      plan: [...plan, { id: 'stabilize', task: 'Add stabilization step' }],
    }),
  });

  const planningRun = await planningRuntime.run('Generate the v3 runtime summary');
  console.log('\nPlanning output:');
  console.dir(planningRun.output, { depth: null });

  printSection('Background Scheduler: Recurring Jobs');
  const scheduler = new BackgroundJobScheduler({
    store: new InMemoryJobStore(),
    handlers: {
      nightly_sync: async payload => ({
        ok: true,
        note: `processed:${payload.topic}`,
      }),
    },
  });

  await scheduler.schedule({
    id: 'nightly-sync',
    handler: 'nightly_sync',
    payload: { topic: 'v3-runtime' },
    runAt: '2026-01-01T00:00:00.000Z',
    intervalMs: 1000,
    maxRuns: 2,
  });

  const schedulerFirstPass = await scheduler.runDueJobs(new Date('2026-01-01T00:00:00.500Z'));
  const schedulerSecondPass = await scheduler.runDueJobs(new Date('2026-01-01T00:00:02.000Z'));
  console.log('\nScheduler passes:');
  console.dir({ schedulerFirstPass, schedulerSecondPass }, { depth: null });

  printSection('Eval Harness and Learning Loop');
  const learningLoop = new LearningLoop();
  learningLoop.recordRun(assessmentRun);
  learningLoop.recordRun(completedRun);
  learningLoop.recordRun(workflowRun);
  learningLoop.recordRun(planningRun);

  const evalHarness = new EvalHarness({
    scenarios: [
      {
        id: 'agent-completed',
        run: async () => completedRun.status,
        assert: status => status === 'completed',
      },
      {
        id: 'workflow-child-metrics',
        run: async () => workflowRun.metrics.childRuns.count,
        assert: count => count >= 2,
      },
      {
        id: 'planning-recovered',
        run: async () => planningRun.output.recoveries.length,
        assert: count => count >= 1,
      },
    ],
  });

  const evalReport = await evalHarness.run({ learningLoop });
  console.log('\nEval report:');
  console.dir(evalReport, { depth: null });
  console.log('\nLearning summary:');
  console.dir(
    {
      summary: learningLoop.summarize(),
      recommendations: learningLoop.buildRecommendations(),
    },
    { depth: null }
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
