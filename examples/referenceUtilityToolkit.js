const {
  Tool,
  PostmanLoader,
  SecretResolver,
  ToolRecorder,
  ToolMockBuilder,
  ToolSandboxRunner,
  PromptRegistry,
  RunRecipe,
  IncidentBundleExporter,
  CapabilityRouter,
  RoutePolicySimulator,
} = require('../index');

async function main() {
  const postmanCollection = {
    variable: [{ key: 'baseUrl', value: 'https://api.example.com' }],
    item: [
      {
        name: 'CreateMessage',
        request: {
          method: 'POST',
          url: { raw: '{{baseUrl}}/messages?channel=ops' },
          header: [{ key: 'X-Trace-Id', value: 'trace-1' }],
          body: {
            mode: 'raw',
            raw: JSON.stringify({ message: 'hello' }),
          },
        },
      },
    ],
  };

  const imported = PostmanLoader.toApiSpec(postmanCollection);
  console.log('Postman API spec');
  console.dir(imported, { depth: null });

  const secretResolver = new SecretResolver({
    env: { API_TOKEN: 'token-123' },
  });
  console.log('Resolved secret config');
  console.dir(secretResolver.resolve({ authorization: 'Bearer ${API_TOKEN}' }), { depth: null });

  const baseTool = new Tool({
    name: 'send_update',
    description: 'Send a mock update.',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
    },
    implementation: async ({ message }) => ({ delivered: true, message }),
  });

  const recorder = new ToolRecorder();
  const recordedTool = recorder.wrap(baseTool);
  const recordedResult = await recordedTool.call({ message: 'hello' });

  const mockTool = ToolMockBuilder.build({
    toolName: 'send_update',
    records: recorder.export().records,
  });

  const sandbox = new ToolSandboxRunner({
    simulator: async (_tool, args) => ({ simulated: true, args }),
  });

  const promptRegistry = new PromptRegistry();
  promptRegistry.register({
    id: 'ops-summary',
    role: 'system',
    content: 'Summarize the operational state concisely.',
  });

  const recipe = new RunRecipe({
    id: 'ops-recipe',
    tools: [baseTool],
  });

  const router = new CapabilityRouter({
    candidates: [
      {
        id: 'cheap-model',
        kind: 'model',
        capabilities: ['summarization'],
        profile: { costTier: 'low', riskTier: 'low', latencyTier: 'low', taskTypes: ['ops_summary'] },
      },
    ],
  });

  const routeSimulation = await new RoutePolicySimulator({ router }).simulate([
    {
      id: 'ops-summary',
      task: { taskType: 'ops_summary', requiredCapabilities: ['summarization'] },
    },
  ]);

  const incidentBundle = new IncidentBundleExporter().export({
    coordinationDiagnostics: { warnings: ['mock_warning'] },
    assuranceReport: { summary: { verdict: 'allow' } },
  });

  console.log('Recorded tool result');
  console.dir(recordedResult, { depth: null });

  console.log('Mock tool result');
  console.dir(await mockTool.call({ message: 'hello' }), { depth: null });

  console.log('Sandbox run');
  console.dir(await sandbox.run(baseTool, { message: 'preview' }, { mode: 'simulate' }), { depth: null });

  console.log('Prompt registry');
  console.dir(promptRegistry.list(), { depth: null });

  console.log('Run recipe options');
  console.dir(recipe.buildAgentOptions(), { depth: null });

  console.log('Route policy simulation');
  console.dir(routeSimulation, { depth: null });

  console.log('Incident bundle');
  console.dir(incidentBundle, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
