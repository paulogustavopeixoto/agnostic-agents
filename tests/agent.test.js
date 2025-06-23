// tests/agent.test.js
const { Agent } = require('../src/agent/Agent');
const { Tool } = require('../src/agent/Tool');
const { MCPTool } = require('../src/tools/MCPTool');
const { RetryManager } = require('../src/utils/RetryManager');

// Mock adapter to simulate provider behavior
class MockAdapter {
  async generateText(messages, { tools = [], temperature = 0.7, maxTokens = 1024 } = {}) {
    if (tools.length > 0 && messages.some(msg => msg.content.includes('tool'))) {
      return {
        message: '',
        toolCalls: [{
          name: tools[0].name,
          arguments: { query: 'test' },
          id: `tool_use_${Date.now()}`
        }]
      };
    }
    return { message: 'Mock response' };
  }

  async generateToolResult(messages, toolCall, toolResult, { temperature = 0.7, maxTokens = 1024 } = {}) {
    return `Tool ${toolCall.name} result: ${JSON.stringify(toolResult)}`;
  }

  async analyzeImage(imageData, { prompt, maxTokens = 1024 } = {}) {
    return `Mock image analysis: ${prompt[prompt.length - 1].content}`;
  }

  async generateImage(prompt, { maxTokens = 1024 } = {}) {
    return ['mock-image-url'];
  }
}

// Mock memory for testing
class MockMemory {
  getContext() {
    return 'Mock context';
  }

  store(userMessage, result) {
    this.lastStored = { userMessage, result };
  }
}

// Mock MCPClient for MCPTool
class MockMCPClient {
  async execute(toolName, input) {
    return `Mock MCP result for ${toolName}: ${JSON.stringify(input)}`;
  }
}

describe('Agent Class', () => {
  let mockAdapter;
  let retryManager;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    retryManager = new RetryManager({ retries: 1, baseDelay: 100, maxDelay: 1000 });
  });

  test('should instantiate without errors', () => {
    const agent = new Agent(null);
    expect(agent).toBeDefined();
    expect(agent.tools).toEqual([]);
    expect(agent.memory).toBeNull();
    expect(agent.retryManager).toBeInstanceOf(RetryManager);
  });

  test('should accept defaultConfig', () => {
    const agent = new Agent(null, {
      defaultConfig: { model: 'gpt-4', temperature: 0.5, maxTokens: 512 },
    });
    expect(agent.defaultConfig.model).toBe('gpt-4');
    expect(agent.defaultConfig.temperature).toBe(0.5);
    expect(agent.defaultConfig.maxTokens).toBe(512);
  });

  test('should build system prompt as message array', () => {
    const memory = new MockMemory();
    const agent = new Agent(mockAdapter, {
      description: 'Test system prompt',
      memory,
    });
    const messages = agent._buildSystemPrompt('Test user prompt');
    expect(messages).toEqual([
      { role: 'system', content: 'Test system prompt' },
      { role: 'user', content: 'Mock context' },
      { role: 'user', content: 'Test user prompt' },
    ]);
  });

  test('should handle text generation without tools', async () => {
    const agent = new Agent(mockAdapter, {
      defaultConfig: { temperature: 0.8 },
    });
    const response = await agent.sendMessage('Hello, world!');
    expect(response).toBe('Mock response');
  });

  test('should handle MCP tool call', async () => {
    const mcpTool = new MCPTool({
      name: 'web_search',
      description: 'Search the web',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      mcpClient: new MockMCPClient(),
    });
    const agent = new Agent(mockAdapter, {
      tools: [mcpTool],
      defaultConfig: { temperature: 0.7, maxTokens: 1024 },
    });
    const response = await agent.sendMessage('Use tool to search');
    expect(response).toContain('Tool web_search result: "Mock MCP result for web_search: {\\"query\\":\\"test\\"}"');
  });

  test('should handle multiple tool calls', async () => {
    const tool1 = new Tool({
      name: 'tool1',
      description: 'First tool',
      parameters: { type: 'object', properties: { query: { type: 'string' } } },
      implementation: async (args) => `Result for ${args.query}`
    });
    const tool2 = new MCPTool({
      name: 'tool2',
      description: 'Second tool (MCP)',
      parameters: { type: 'object', properties: { query: { type: 'string' } } },
      mcpClient: new MockMCPClient(),
    });
    mockAdapter.generateText = jest.fn().mockResolvedValue({
      message: '',
      toolCalls: [
        { name: 'tool1', arguments: { query: 'test1' }, id: 'tool_use_1' },
        { name: 'tool2', arguments: { query: 'test2' }, id: 'tool_use_2' },
      ]
    });
    const agent = new Agent(mockAdapter, {
      tools: [tool1, tool2],
      defaultConfig: { maxTokens: 1024 },
    });
    const response = await agent.sendMessage('Use multiple tools');
    expect(response).toContain('Tool tool1 result: "Result for test1"');
    expect(response).toContain('Tool tool2 result: "Mock MCP result for tool2: {\\"query\\":\\"test2\\"}"');
  });

  test('should throw error for unknown tool', async () => {
    mockAdapter.generateText = jest.fn().mockResolvedValue({
      message: '',
      toolCalls: [{ name: 'unknown_tool', arguments: {}, id: 'tool_use_1' }]
    });
    const agent = new Agent(mockAdapter, { tools: [] });
    await expect(agent.sendMessage('Use unknown tool')).rejects.toThrow('Tool unknown_tool not found.');
  });

  test('should handle image analysis', async () => {
    const agent = new Agent(mockAdapter);
    const response = await agent.analyzeImage('mock-image-data', { prompt: 'Describe this' });
    expect(response).toBe('Mock image analysis: Describe this');
  });

  test('should handle image generation', async () => {
    const agent = new Agent(mockAdapter);
    const response = await agent.generateImage('Create an image');
    expect(response).toEqual(['mock-image-url']);
  });

  test('should merge config with defaultConfig', async () => {
    const agent = new Agent(mockAdapter, {
      defaultConfig: { model: 'default-model', temperature: 0.5, maxTokens: 512 },
    });
    mockAdapter.generateText = jest.fn().mockResolvedValue({ message: 'Mock response' });
    await agent.sendMessage('Test config', { temperature: 0.9, maxTokens: 2048 });
    expect(mockAdapter.generateText).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        model: 'default-model',
        temperature: 0.9,
        maxTokens: 2048,
        tools: []
      })
    );
  });

  test('should store memory if available', async () => {
    const memory = new MockMemory();
    const agent = new Agent(mockAdapter, { memory });
    await agent.sendMessage('Test memory');
    expect(memory.lastStored).toEqual({
      userMessage: 'Test memory',
      result: { message: 'Mock response' },
    });
  });

  test('should handle RAG if provided', async () => {
    const rag = {
      query: jest.fn().mockResolvedValue({ message: 'RAG response' })
    };
    const agent = new Agent(mockAdapter, { rag });
    const response = await agent.sendMessage('Test RAG', { useRag: true });
    expect(rag.query).toHaveBeenCalled();
    expect(response).toBe('RAG response');
  });

  test('should handle invalid tool call format', async () => {
    mockAdapter.generateText = jest.fn().mockResolvedValue({
      message: '',
      toolCalls: [{ name: null, arguments: {} }]
    });
    const agent = new Agent(mockAdapter, { tools: [] });
    await expect(agent.sendMessage('Invalid tool call')).rejects.toThrow('Invalid tool call format: missing name or arguments');
  });
});