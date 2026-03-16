require('dotenv').config();

const {
  Agent,
  Tool,
  Memory,
  LocalVectorStore,
  RAG,
  OpenAIAdapter,
  InMemoryRunStore,
  Workflow,
  AgentWorkflowStep,
  WorkflowRunner,
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
    policies: {
      conversationLimit: 8,
      workingLimit: 8,
      profileLimit: 8,
      policyLimit: 8,
    },
  });

  await memory.setProfile('user_name', 'Paulo');
  await memory.setWorkingMemory('current_goal', 'Validate the v2 runtime');
  await memory.setPolicy('approval_required', 'send_status_update');

  const rag = new RAG({
    adapter,
    vectorStore: new LocalVectorStore(),
    chunkSize: 240,
    chunkOverlap: 30,
    chunkStrategy: 'fixed',
  });

  await rag.index([
    'Lisbon is the capital of Portugal and sits on the Atlantic coast.',
    'The v2 runtime supports runs, checkpoints, approval gating, workflow execution, inspection, fallback routing, and structured memory.',
    'A worker should ask for approval before sending an external status update.',
  ]);

  const sendStatusUpdate = new Tool({
    name: 'send_status_update',
    description: 'Send a mock status update to a stakeholder.',
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
      costHint: 'low',
    },
    implementation: async ({ recipient, summary }) => ({
      delivered: true,
      recipient,
      summary,
      deliveredAt: new Date().toISOString(),
    }),
  });

  const runStore = new InMemoryRunStore();

  const agent = new Agent(adapter, {
    tools: [sendStatusUpdate],
    memory,
    rag,
    runStore,
    description:
      'You are an operations worker. Use retrieval context. When the user asks you to send an update, you must call the send_status_update tool exactly once and must not pretend the tool already ran.',
    defaultConfig: { temperature: 0.2, maxTokens: 400 },
    onEvent: async event => printEvent('[agent]', event),
  });

  printSection('Agent Run 1: Grounded Summary');
  const summaryRun = await agent.run(
    'Using the retrieved context only, summarize the v2 runtime capabilities in 3 short bullets. Do not call any tools.'
  );

  console.log('\nAgent summary output:');
  console.log(summaryRun.output);

  console.log('\nAgent summary run inspection:');
  console.dir(agent.inspectRun(summaryRun), { depth: null });

  printSection('Agent Run 2: Approval-Gated Tool Execution');
  const initialRun = await agent.run(
    [
      'You must send a status update now.',
      'Call the send_status_update tool exactly once.',
      'Do not simulate sending the update in plain text.',
      'After the tool result comes back, provide a one-sentence confirmation.',
      'Recipient: Paulo',
      'Summary: v2 runtime validated with runs, checkpoints, approval gating, workflow execution, fallback routing, and structured memory.',
    ].join('\n')
  );

  if (initialRun.status === 'waiting_for_approval') {
    console.log('Run is waiting for approval. Approving tool execution...');
  }

  const finalRun =
    initialRun.status === 'waiting_for_approval'
      ? await agent.resumeRun(initialRun.id, { approved: true, reason: 'demo approval granted' })
      : initialRun;

  if (initialRun.status !== 'waiting_for_approval') {
    console.warn(
      'Warning: the model did not enter the approval-gated tool path. Re-run the demo if you want to observe the tool approval flow.'
    );
  }

  console.log('\nAgent tool-run output:');
  console.log(finalRun.output);

  console.log('\nAgent tool-run summary:');
  console.dir(agent.inspectRun(finalRun), { depth: null });

  const researcher = new Agent(adapter, {
    memory,
    rag,
    description: 'You are a research worker. Be factual and concise.',
    defaultConfig: { temperature: 0.2, maxTokens: 300 },
  });

  const writer = new Agent(adapter, {
    memory,
    description: 'You are a writing worker. Turn prior research into a crisp deliverable.',
    defaultConfig: { temperature: 0.2, maxTokens: 300 },
  });

  const workflow = new Workflow({
    id: 'daily-sync-demo',
    name: 'Daily Sync Demo',
    steps: [
      new AgentWorkflowStep({
        id: 'research',
        assignee: 'researcher',
        agent: researcher,
        prompt: () =>
          'Using the retrieved knowledge, list three concrete v2 runtime capabilities in bullet form.',
      }),
      new AgentWorkflowStep({
        id: 'draft_update',
        assignee: 'writer',
        dependsOn: ['research'],
        handoff: {
          from: 'researcher',
          to: 'writer',
          reason: 'Turn findings into a manager-friendly update.',
        },
        agent: writer,
        prompt: ({ dependencyResults }) =>
          `Turn this research into a short end-of-day update:\n${dependencyResults.research.output}`,
      }),
    ],
  });

  const workflowRunner = new WorkflowRunner({
    workflow,
    runStore: new InMemoryRunStore(),
    onEvent: async event => printEvent('[workflow]', event),
  });

  printSection('Workflow Run');
  const workflowRun = await workflowRunner.run('Prepare a daily sync update');

  console.log('\nWorkflow output:');
  console.dir(workflowRun.output, { depth: null });

  console.log('\nWorkflow run summary:');
  console.dir(workflowRunner.inspectRun(workflowRun), { depth: null });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
