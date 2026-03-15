const fs = require('fs');
const os = require('os');
const path = require('path');

const pkg = require('../index');
const { Tool } = require('../src/tools/adapters/Tool');
const { Memory } = require('../src/agent/Memory');
const { RetryManager } = require('../src/utils/RetryManager');
const { RAG } = require('../src/rag/RAG');
const { LocalVectorStore } = require('../src/db/LocalVectorStore');
const { MCPClient } = require('../src/mcp/MCPClient');
const { OpenAPILoader } = require('../src/api/OpenAPILoader');
const { ApiLoader } = require('../src/api/ApiLoader');
const { ToolValidator } = require('../src/utils/ToolValidator');

describe('Package/module unit tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('index exports the public surface', () => {
    expect(pkg.Agent).toBeDefined();
    expect(pkg.Tool).toBeDefined();
    expect(pkg.Memory).toBeDefined();
    expect(pkg.RAG).toBeDefined();
    expect(pkg.MCPClient).toBeDefined();
    expect(pkg.OpenAPILoader).toBeDefined();
    expect(pkg.ApiLoader).toBeDefined();
    expect(pkg.InvalidToolCallError).toBeDefined();
  });

  test('Tool exposes unified schema and provider-specific representations', async () => {
    const tool = new Tool({
      name: 'calculate',
      description: 'Do math',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string' },
        },
        required: ['expression'],
      },
      implementation: async ({ expression }) => ({ result: expression }),
    });

    expect(tool.toUnifiedSchema()).toMatchObject({
      name: 'calculate',
      description: 'Do math',
    });
    expect(tool.toOpenAIFunction()).toEqual({
      name: 'calculate',
      description: 'Do math',
      parameters: tool.parameters,
    });
    expect(tool.toAnthropicTool()).toEqual({
      name: 'calculate',
      description: 'Do math',
      input_schema: tool.parameters,
    });
    await expect(tool.call({ expression: '1+1' })).resolves.toEqual({ result: '1+1' });
  });

  test('ToolValidator rejects malformed schemas', () => {
    const validator = new ToolValidator();
    const malformedTool = {
      name: 'broken',
      parameters: {
        type: 'not-a-real-json-schema-type',
      },
    };

    expect(() => validator.validate(malformedTool, {})).toThrow();
  });

  test('Memory supports entities, conversation context, semantic lookup, and clearing', async () => {
    const adapter = {
      embedChunks: jest.fn()
        .mockResolvedValueOnce([{ embedding: [1, 0] }])
        .mockResolvedValueOnce([{ embedding: [1, 0] }])
        .mockResolvedValueOnce([{ embedding: [1, 0] }]),
    };
    const vectorStore = {
      upsert: jest.fn().mockResolvedValue({}),
      query: jest.fn().mockResolvedValue({
        matches: [{ metadata: { fact: 'Lisbon is sunny' }, score: 0.99 }],
      }),
      deleteAll: jest.fn().mockResolvedValue(undefined),
    };

    const memory = new Memory({ adapter, vectorStore });
    memory.storeConversation('hello', 'world');
    memory.setEntity('City', 'Lisbon');

    expect(memory.getContext()).toContain('User: hello');
    expect(memory.getEntity('city')).toBe('Lisbon');

    await memory.storeSemanticMemory('Lisbon is sunny');
    await expect(memory.searchSemanticMemory('weather')).resolves.toBe('Lisbon is sunny');
    await expect(memory.searchAll('weather')).resolves.toEqual([{ fact: 'Lisbon is sunny', score: 0.99 }]);
    await memory.clearAll();
    expect(memory.conversation).toEqual([]);
    expect(memory.entities).toEqual({});
    expect(vectorStore.deleteAll).toHaveBeenCalled();
  });

  test('RetryManager retries until success', async () => {
    const retryManager = new RetryManager({ retries: 2, baseDelay: 1, maxDelay: 1 });
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValue('ok');

    await expect(retryManager.execute(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('RAG indexes, searches, queries, and deletes using the local store', async () => {
    const adapter = {
      embedChunks: jest.fn().mockResolvedValue([{ embedding: [1, 0, 0] }]),
      generateText: jest.fn().mockResolvedValue({ message: 'grounded answer' }),
    };

    const rag = new RAG({
      adapter,
      vectorStore: new LocalVectorStore(),
      chunkSize: 50,
    });

    const insertedIds = await rag.index(['Lisbon is the capital of Portugal.']);
    expect(insertedIds).toHaveLength(1);

    const searchResults = await rag.search('Lisbon');
    expect(searchResults[0]).toContain('Lisbon');

    const answer = await rag.query('What is Lisbon?');
    expect(answer).toEqual({ message: 'grounded answer' });

    await expect(rag.delete({ ids: insertedIds })).resolves.toBeUndefined();
  });

  test('MCPClient delegates list/execute and converts discovered tools', async () => {
    const client = new MCPClient({ endpoint: 'ws://example.com' });
    client._send = jest.fn()
      .mockResolvedValueOnce({
        tools: [{ name: 'weather.search', description: 'Search weather', inputSchema: { type: 'object', properties: {} } }],
      })
      .mockResolvedValueOnce({ output: { forecast: 'sunny' } })
      .mockResolvedValueOnce({
        tools: [{ name: 'weather.search', description: 'Search weather', inputSchema: { type: 'object', properties: {} } }],
      })
      .mockResolvedValueOnce({ output: { forecast: 'sunny' } });

    await expect(client.listTools()).resolves.toHaveLength(1);
    await expect(client.execute('weather.search', { city: 'Lisbon' })).resolves.toEqual({ forecast: 'sunny' });

    const tools = await client.toTools();
    expect(tools[0].name).toBe('weather_search');
    await expect(tools[0].call({ city: 'Lisbon' })).resolves.toEqual({ forecast: 'sunny' });
  });

  test('OpenAPILoader builds tools from a JSON OpenAPI spec', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openapi-loader-'));
    const specPath = path.join(tmpDir, 'spec.json');

    fs.writeFileSync(specPath, JSON.stringify({
      openapi: '3.0.0',
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/weather/{city}': {
          get: {
            summary: 'Get weather',
            parameters: [
              { name: 'city', in: 'path', required: true, schema: { type: 'string' } },
            ],
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { forecast: { type: 'string' } } },
                  },
                },
              },
            },
          },
        },
      },
    }));

    const { tools } = OpenAPILoader.load(specPath, { serviceName: 'weather' });
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toContain('weather');
  });

  test('ApiLoader builds executable tools and routes params to fetch', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ forecast: 'sunny' }),
      text: async () => '',
    });

    const { tools } = ApiLoader.load({
      serviceName: 'weather',
      authToken: 'secret',
      apiSpec: {
        baseUrl: 'https://api.example.com',
        endpoints: {
          getWeather: {
            path: '/weather/{city}',
            method: 'GET',
            queryParams: {
              unit: { type: 'string' },
            },
            pathParams: {
              city: { type: 'string', required: true },
            },
            requiresAuth: true,
          },
        },
      },
    });

    const result = await tools[0].call({ city: 'Lisbon', unit: 'metric' });
    expect(result).toEqual({ status: 200, data: { forecast: 'sunny' } });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/weather/Lisbon?unit=metric',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
      })
    );
  });
});
