const { Agent } = require('../src/agent/Agent');
const { Tool } = require('../src/tools/adapters/Tool');
const { MCPTool } = require('../src/mcp/MCPTool');
const { RetryManager } = require('../src/utils/RetryManager');
const { LocalVectorStore } = require('../src/db/LocalVectorStore');
const { RAG } = require('../src/rag/RAG');
const {
  InvalidToolCallError,
  ToolExecutionError,
  ToolNotFoundError,
} = require('../src/errors');

class MockAdapter {
  async generateText(messages, { tools = [] } = {}) {
    const text = messages.map(message => String(message.content || '')).join('\n');

    if (text.includes('Tool ') && text.includes('result:')) {
      const lastFunctionResult = [...messages].reverse().find(message => message.role === 'function');
      return {
        message: `Final answer based on ${lastFunctionResult.content}`,
      };
    }

    if (messages.some(message => message.role === 'function')) {
      const lastFunctionResult = [...messages].reverse().find(message => message.role === 'function');
      return {
        message: `Final answer based on ${lastFunctionResult.content}`,
      };
    }

    if (tools.length > 0 && text.includes('Use tool')) {
      return {
        message: '',
        toolCalls: [
          {
            name: tools[0].name,
            arguments: { query: 'test' },
            id: 'tool_use_1',
          },
        ],
      };
    }

    return { message: 'Mock response' };
  }

  async analyzeImage(imageData, { prompt } = {}) {
    return `Mock image analysis: ${prompt.user}`;
  }

  async generateImage(promptObject) {
    return [`generated:${promptObject.user}`];
  }

  async embedChunks(chunks) {
    return chunks.map(chunk => ({
      embedding: [chunk.length, chunk.split(' ').length, 1],
    }));
  }
}

class MockMemory {
  constructor() {
    this.entities = {};
    this.conversation = [];
  }

  getContext() {
    return this.conversation
      .map(turn => `User: ${turn.user}\nAgent: ${turn.agent}`)
      .join('\n');
  }

  storeConversation(userMessage, agentResponse) {
    this.lastStored = { userMessage, agentResponse };
    this.conversation.push({ user: userMessage, agent: agentResponse });
  }

  getEntity(key) {
    return this.entities[key] || null;
  }

  async get(key) {
    return this.entities[key] || null;
  }

  async set(key, value) {
    this.entities[key] = value;
  }
}

class MockMCPClient {
  async execute(toolName, input) {
    return `Mock MCP result for ${toolName}: ${JSON.stringify(input)}`;
  }
}

describe('Agent', () => {
  let mockAdapter;
  let retryManager;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    retryManager = new RetryManager({ retries: 1, baseDelay: 1, maxDelay: 5 });
  });

  test('instantiates with sensible defaults', () => {
    const agent = new Agent(mockAdapter);

    expect(agent).toBeDefined();
    expect(agent.tools).toEqual([]);
    expect(agent.memory).toBeNull();
    expect(agent.retryManager).toBeInstanceOf(RetryManager);
  });

  test('builds a prompt object with description, context, and user prompt', async () => {
    const memory = new MockMemory();
    memory.conversation.push({ user: 'Previous', agent: 'Earlier answer' });
    memory.entities.location = 'Lisbon';

    const agent = new Agent(mockAdapter, {
      description: 'Test system prompt',
      memory,
    });

    const prompt = await agent._buildSystemPrompt('Test user prompt');

    expect(prompt.system).toContain('Test system prompt');
    expect(prompt.context).toContain('User: Previous');
    expect(prompt.context).toContain('location: Lisbon');
    expect(prompt.user).toBe('Test user prompt');
  });

  test('generates a plain text response without tools', async () => {
    const agent = new Agent(mockAdapter, {
      defaultConfig: { temperature: 0.8 },
    });

    await expect(agent.sendMessage('Hello, world!')).resolves.toBe('Mock response');
  });

  test('executes a standard tool and returns the follow-up answer', async () => {
    const tool = new Tool({
      name: 'web_search',
      description: 'Search the web',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
      implementation: async ({ query }) => `Result for ${query}`,
    });

    const agent = new Agent(mockAdapter, { tools: [tool], retryManager });
    const response = await agent.sendMessage('Use tool to search');

    expect(response).toContain('Result for test');
  });

  test('executes an MCP tool', async () => {
    const mcpTool = new MCPTool({
      name: 'web_search',
      description: 'Search the web',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
      mcpClient: new MockMCPClient(),
    });

    const agent = new Agent(mockAdapter, { tools: [mcpTool], retryManager });
    const response = await agent.sendMessage('Use tool to search');

    expect(response).toContain('Mock MCP result for web_search');
  });

  test('throws for unknown tools', async () => {
    mockAdapter.generateText = jest.fn().mockResolvedValue({
      message: '',
      toolCalls: [{ name: 'unknown_tool', arguments: {}, id: 'tool_use_1' }],
    });

    const agent = new Agent(mockAdapter, { tools: [], retryManager });
    await expect(agent.sendMessage('Use tool')).rejects.toBeInstanceOf(ToolNotFoundError);
  });

  test('throws for invalid tool call format', async () => {
    mockAdapter.generateText = jest.fn().mockResolvedValue({
      message: '',
      toolCalls: [{ name: null, arguments: {} }],
    });

    const agent = new Agent(mockAdapter, { tools: [], retryManager });
    await expect(agent.sendMessage('Use tool')).rejects.toBeInstanceOf(InvalidToolCallError);
  });

  test('applies JSON schema defaults before tool execution', async () => {
    const tool = new Tool({
      name: 'greet',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', default: 'world' },
        },
      },
      implementation: async ({ name }) => ({ greeting: `hello ${name}` }),
    });

    const result = await new Agent(mockAdapter, { tools: [tool] })._handleToolCall({
      name: 'greet',
      arguments: {},
    });

    expect(result).toEqual({ greeting: 'hello world' });
  });

  test('stores conversation when memory is available', async () => {
    const memory = new MockMemory();
    const agent = new Agent(mockAdapter, { memory });

    await agent.sendMessage('Test memory');

    expect(memory.lastStored).toEqual({
      userMessage: 'Test memory',
      agentResponse: 'Mock response',
    });
  });

  test('adds RAG context without bypassing the main agent loop', async () => {
    const rag = {
      search: jest.fn().mockResolvedValue(['Relevant fact']),
    };
    const spy = jest.spyOn(mockAdapter, 'generateText');
    const agent = new Agent(mockAdapter, { rag });

    await agent.sendMessage('Question with retrieval');

    expect(rag.search).toHaveBeenCalledWith('Question with retrieval', {});
    expect(spy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('Retrieved context:\nRelevant fact'),
        }),
      ]),
      expect.objectContaining({ tools: [] })
    );
  });

  test('analyzes images with a resolved prompt object', async () => {
    const agent = new Agent(mockAdapter);
    await expect(agent.analyzeImage('mock-image-data', { prompt: 'Describe this' })).resolves.toBe(
      'Mock image analysis: Describe this'
    );
  });

  test('generates images with a resolved prompt object', async () => {
    const agent = new Agent(mockAdapter);
    await expect(agent.generateImage('Create an image')).resolves.toEqual(['generated:Create an image']);
  });

  test('wraps tool implementation failures in a stable error type', async () => {
    const tool = new Tool({
      name: 'explode',
      parameters: {
        type: 'object',
        properties: {},
      },
      implementation: async () => {
        throw new Error('boom');
      },
    });

    await expect(
      new Agent(mockAdapter, { tools: [tool] })._handleToolCall({
        name: 'explode',
        arguments: {},
      })
    ).rejects.toBeInstanceOf(ToolExecutionError);
  });

  test('allows local RAG without an index name', async () => {
    const rag = new RAG({
      adapter: mockAdapter,
      vectorStore: new LocalVectorStore(),
    });

    await expect(rag.index(['retrieval works locally'])).resolves.toHaveLength(1);
  });
});
