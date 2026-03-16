require('dotenv').config();

const {
  Agent,
  Tool,
  OpenAIAdapter,
  InMemoryRunStore,
  InMemoryJobStore,
  ApprovalInbox,
  GovernanceHooks,
  Workflow,
  AgentWorkflowStep,
  WorkflowRunner,
  DelegationRuntime,
  DelegationContract,
  PlanningRuntime,
  BackgroundJobScheduler,
  RunInspector,
  RunTreeInspector,
  TraceDiffer,
  TraceSerializer,
  IncidentDebugger,
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

  const runStore = new InMemoryRunStore();
  const approvalInbox = new ApprovalInbox();
  const governanceLog = [];

  const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY, {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  });

  const governanceHooks = new GovernanceHooks({
    onEvent: async (type, payload) => {
      if (['policy_decision', 'approval_requested', 'approval_resolved', 'run_completed'].includes(type)) {
        governanceLog.push({ type, payload });
      }
    },
    onApprovalRequested: async payload => {
      await approvalInbox.add({
        id: payload.toolCall?.id || `${payload.runId}:approval`,
        ...payload,
      });
    },
  });

  const sendStatusUpdate = new Tool({
    name: 'send_status_update',
    description: 'Send an external status update.',
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
      verificationPolicy: 'require_verifier',
      sideEffectLevel: 'external_write',
      costHint: 'low',
    },
    implementation: async ({ recipient, summary }) => ({
      delivered: true,
      recipient,
      summary,
      deliveredAt: new Date().toISOString(),
    }),
  });

  const operator = new Agent(adapter, {
    tools: [sendStatusUpdate],
    runStore,
    approvalInbox,
    governanceHooks,
    verifier: adapter,
    description:
      'You are a runtime control-plane agent. Use tools only when asked and never claim a tool ran before it did.',
    defaultConfig: { temperature: 0.2, maxTokens: 300, selfVerify: true },
    onEvent: async event => printEvent('[agent]', event),
  });

  printSection('Agent Run: Approval, Replay, and Branching');
  const initialRun = await operator.run(
    [
      'Send Paulo a one-line runtime update now.',
      'Call send_status_update exactly once.',
      'Do not simulate sending the update in plain text.',
      'After the tool result comes back, provide a one-sentence confirmation.',
      'Recipient: Paulo',
      'Summary: v4 runtime control plane validated.',
    ].join('\n')
  );

  const completedRun =
    initialRun.status === 'waiting_for_approval'
      ? await operator.resumeRun(initialRun.id, {
          approved: true,
          reason: 'demo approval granted',
        })
      : initialRun;

  const approvalCheckpoint =
    completedRun.checkpoints.find(checkpoint => checkpoint.label === 'tool_completed')?.id ||
    completedRun.checkpoints[0]?.id ||
    null;

  const branchedRun = await operator.branchRun(completedRun.id, {
    checkpointId: approvalCheckpoint,
    metadata: { branchLabel: 'post-tool-investigation' },
  });
  const replayRun = await operator.replayRun(completedRun.id);
  const partialReplayRun = await operator.replayRun(completedRun.id, {
    checkpointId: approvalCheckpoint,
  });

  console.log('\nCompleted run summary:');
  console.dir(RunInspector.summarize(completedRun), { depth: null });
  console.log('\nBranch summary:');
  console.dir(RunInspector.summarize(branchedRun), { depth: null });
  console.log('\nReplay diff (original vs replay):');
  console.dir(TraceDiffer.diff(completedRun, replayRun), { depth: null });
  console.log('\nPartial replay summary:');
  console.dir(RunInspector.summarize(partialReplayRun), { depth: null });

  printSection('Workflow Run Tree and Aggregated Metrics');
  const researcher = new Agent(adapter, {
    runStore,
    verifier: adapter,
    description: 'Produce short factual bullets.',
    defaultConfig: { temperature: 0.2, maxTokens: 120, selfVerify: true },
  });
  const writer = new Agent(adapter, {
    runStore,
    verifier: adapter,
    description: 'Turn findings into a concise manager update.',
    defaultConfig: { temperature: 0.2, maxTokens: 160, selfVerify: true },
  });

  const workflow = new Workflow({
    id: 'v4-runtime-demo',
    steps: [
      new AgentWorkflowStep({
        id: 'research',
        assignee: 'researcher',
        agent: researcher,
        delegationRuntime: new DelegationRuntime(),
        delegationContract: new DelegationContract({
          id: 'research-contract',
          assignee: 'researcher',
          requiredInputs: ['prompt'],
        }),
        prompt: () =>
          [
            'List exactly three concrete capabilities from this set only:',
            '- run tree inspection',
            '- trace diffing',
            '- incident debugging',
            '- governance hooks',
            '- frozen replay',
            'Return short bullets and do not invent capabilities outside this list.',
          ].join('\n'),
      }),
      new AgentWorkflowStep({
        id: 'draft_update',
        dependsOn: ['research'],
        assignee: 'writer',
        agent: writer,
        delegationRuntime: new DelegationRuntime(),
        delegationContract: new DelegationContract({
          id: 'writer-contract',
          assignee: 'writer',
          requiredInputs: ['prompt'],
        }),
        prompt: ({ dependencyResults }) =>
          [
            'Write exactly one sentence.',
            'Describe these as shipped runtime-control capabilities of the agnostic-agents v4 baseline.',
            'Name the capabilities directly and do not translate them into generic infrastructure concepts.',
            'Do not mention dates.',
            'Research:',
            dependencyResults.research.output,
          ].join('\n'),
      }),
    ],
  });

  const workflowRunner = new WorkflowRunner({
    workflow,
    runStore,
    onEvent: async event => printEvent('[workflow]', event),
  });

  const workflowRun = await workflowRunner.run('Prepare the v4 runtime-control summary');
  const runTree = await RunTreeInspector.build(runStore, {
    rootRunId: workflowRun.id,
  });

  console.log('\nWorkflow summary:');
  console.dir(workflowRunner.inspectRun(workflowRun), { depth: null });
  console.log('\nRendered run tree:');
  console.log(RunTreeInspector.render(runTree));

  printSection('Offline Incident Debugging and Portable Traces');
  const planningRuntime = new PlanningRuntime({
    runStore,
    planner: async ({ input }) => [{ id: 'review', task: `Review ${input}` }],
    executor: async () => {
      throw new Error('simulated verifier pipeline failure');
    },
    recovery: null,
    verifier: null,
  });

  const failedPlanningRunId = 'v4-runtime-incident';
  try {
    await planningRuntime.run('runtime incident', { runId: failedPlanningRunId });
  } catch (_error) {
    // Intentional failure for the incident debugging demo.
  }
  const failedPlanningRun = await runStore.getRun(failedPlanningRunId);
  const incidentDebugger = new IncidentDebugger({ runStore });
  const incidentReport = await incidentDebugger.createReport(failedPlanningRun.id, {
    compareToRunId: completedRun.id,
  });
  const traceBundle = TraceSerializer.exportBundle(await runStore.listRuns(), {
    exportedFor: 'v4-runtime-demo',
  });

  console.log('\nIncident report:');
  console.dir(incidentReport, { depth: null });
  console.log('\nPortable trace bundle index:');
  console.dir(traceBundle.index, { depth: null });

  printSection('Background Scheduling');
  const scheduler = new BackgroundJobScheduler({
    store: new InMemoryJobStore(),
    handlers: {
      runtime_sync: async payload => ({ ok: true, topic: payload.topic }),
    },
  });

  await scheduler.schedule({
    id: 'v4-nightly-sync',
    handler: 'runtime_sync',
    payload: { topic: 'v4-runtime' },
    runAt: new Date().toISOString(),
    intervalMs: 60_000,
    maxRuns: 1,
  });

  console.log('\nScheduled job results:');
  console.dir(await scheduler.runDueJobs(), { depth: null });

  printSection('Governance Inbox');
  console.log('\nApprovals:');
  console.dir(await approvalInbox.list(), { depth: null });
  console.log('\nGovernance events:');
  console.dir(governanceLog, { depth: null });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
