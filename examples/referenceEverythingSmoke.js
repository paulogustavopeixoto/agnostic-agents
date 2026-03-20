const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  Tool,
  OpenAPILoader,
  CurlLoader,
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

function buildOpenApiSpec() {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Weather API',
      version: '1.0.0',
    },
    servers: [{ url: 'https://api.example.com' }],
    paths: {
      '/forecast/{city}': {
        get: {
          summary: 'Get forecast',
          parameters: [
            {
              name: 'city',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'unit',
              in: 'query',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Forecast result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      forecast: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agnostic-smoke-'));
  const specPath = path.join(tmpDir, 'weather.json');
  fs.writeFileSync(specPath, JSON.stringify(buildOpenApiSpec(), null, 2), 'utf8');

  const openApiImport = OpenAPILoader.load(specPath, {
    serviceName: 'weather',
    authToken: 'token-1',
  });

  const curlImport = CurlLoader.load(
    "curl -X POST 'https://api.example.com/messages?channel=ops' -H 'Authorization: Bearer token-123' -d '{\"message\":\"hello\"}'",
    { serviceName: 'curlImported' }
  );

  const postmanImport = PostmanLoader.load(
    {
      variable: [{ key: 'baseUrl', value: 'https://api.example.com' }],
      item: [
        {
          name: 'CreateMessage',
          request: {
            method: 'POST',
            url: { raw: '{{baseUrl}}/messages?channel=ops' },
            body: {
              mode: 'raw',
              raw: JSON.stringify({ message: 'hello' }),
            },
          },
        },
      ],
    },
    {
      serviceName: 'postmanImported',
      authToken: 'token-2',
    }
  );

  const secretResolver = new SecretResolver({
    env: { API_TOKEN: 'secret-123' },
  });

  const baseTool = new Tool({
    name: 'send_update',
    description: 'Send an update.',
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
    content: 'Summarize the operational state.',
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
        profile: {
          taskTypes: ['ops_summary'],
          costTier: 'low',
          riskTier: 'low',
          latencyTier: 'low',
        },
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

  console.log('Everything smoke summary');
  console.dir(
    {
      openApiTools: openApiImport.tools.map(tool => tool.name),
      curlTools: curlImport.tools.map(tool => tool.name),
      postmanTools: postmanImport.tools.map(tool => tool.name),
      resolvedSecret: secretResolver.resolve({ authorization: 'Bearer ${API_TOKEN}' }),
      recordedResult,
      mockedResult: await mockTool.call({ message: 'hello' }),
      sandboxResult: await sandbox.run(baseTool, { message: 'preview' }, { mode: 'simulate' }),
      prompts: promptRegistry.list(),
      recipeToolCount: recipe.buildAgentOptions().tools.length,
      routeSimulation,
      incidentBundleKind: incidentBundle.kind,
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
