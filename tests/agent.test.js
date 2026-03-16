const { Agent } = require('../src/agent/Agent');
const { Tool } = require('../src/tools/adapters/Tool');
const { MCPTool } = require('../src/mcp/MCPTool');
const { RetryManager } = require('../src/utils/RetryManager');
const { LocalVectorStore } = require('../src/db/LocalVectorStore');
const { RAG } = require('../src/rag/RAG');
const { ToolPolicy } = require('../src/runtime/ToolPolicy');
const { InMemoryRunStore } = require('../src/runtime/stores/InMemoryRunStore');
const { EventBus } = require('../src/runtime/EventBus');
const { RunInspector } = require('../src/runtime/RunInspector');
const {
  InvalidToolCallError,
  ToolExecutionError,
  ToolNotFoundError,
  ToolPolicyError,
  RunPausedError,
  RunCancelledError,
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
    memory.listWorkingMemory = () => [{ key: 'task', value: 'ship v2' }];
    memory.listPolicies = () => [{ key: 'approval_required', value: 'delete_records' }];

    const agent = new Agent(mockAdapter, {
      description: 'Test system prompt',
      memory,
    });

    const prompt = await agent._buildSystemPrompt('Test user prompt');

    expect(prompt.system).toContain('Test system prompt');
    expect(prompt.context).toContain('User: Previous');
    expect(prompt.context).toContain('location: Lisbon');
    expect(prompt.context).toContain('Working memory task: ship v2');
    expect(prompt.context).toContain('Policy approval_required: delete_records');
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
      searchWithProvenance: jest.fn().mockResolvedValue({
        query: 'Question with retrieval',
        matches: [
          {
            id: 'doc-1',
            text: 'Relevant fact',
            score: 0.91,
            metadata: { source: 'kb://fact-1' },
          },
        ],
      }),
    };
    const spy = jest.spyOn(mockAdapter, 'generateText');
    const agent = new Agent(mockAdapter, { rag });

    await agent.sendMessage('Question with retrieval');

    expect(rag.searchWithProvenance).toHaveBeenCalledWith('Question with retrieval', {});
    expect(spy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('Retrieved context:\nRelevant fact'),
        }),
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('Sources:\n[1] kb://fact-1 (score: 0.910)'),
        }),
      ]),
      expect.objectContaining({ tools: [] })
    );
  });

  test('supports combined RAG context and tool execution in the same run', async () => {
    const rag = {
      searchWithProvenance: jest.fn().mockResolvedValue({
        query: 'What should I know about Lisbon and the weather?',
        matches: [
          {
            id: 'lisbon-weather',
            text: 'Lisbon is windy today.',
            score: 0.82,
            metadata: { source: 'weather-note' },
          },
        ],
      }),
    };
    const tool = new Tool({
      name: 'get_weather',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
      implementation: async () => ({ forecast: 'Sunny', temperatureC: 21 }),
    });

    mockAdapter.generateText = jest.fn()
      .mockResolvedValueOnce({
        message: '',
        toolCalls: [{ name: 'get_weather', arguments: { query: 'Lisbon weather' }, id: 'tool_use_1' }],
      })
      .mockResolvedValueOnce({
        message: 'Grounded answer with tool data',
      });

    const agent = new Agent(mockAdapter, { tools: [tool], rag, retryManager });
    const response = await agent.sendMessage('What should I know about Lisbon and the weather?');

    expect(response).toBe('Grounded answer with tool data');
    expect(rag.searchWithProvenance).toHaveBeenCalled();
    expect(mockAdapter.generateText).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('Retrieved context:\nLisbon is windy today.'),
        }),
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('Sources:\n[1] weather-note (score: 0.820)'),
        }),
      ]),
      expect.objectContaining({ tools: [tool] })
    );
    expect(mockAdapter.generateText).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({ role: 'function', name: 'get_weather' }),
      ]),
      expect.objectContaining({ tools: [tool] })
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

  test('creates a persisted run with structured events', async () => {
    const runStore = new InMemoryRunStore();
    const agent = new Agent(mockAdapter, { runStore });

    const run = await agent.run('Hello runtime');
    const storedRun = await runStore.getRun(run.id);

    expect(run.status).toBe('completed');
    expect(run.output).toBe('Mock response');
    expect(storedRun).not.toBeNull();
    expect(storedRun.events.map(event => event.type)).toEqual(
      expect.arrayContaining(['run_started', 'model_request', 'model_response', 'run_completed'])
    );
    expect(storedRun.checkpoints.map(checkpoint => checkpoint.label)).toEqual(
      expect.arrayContaining(['run_started', 'model_response', 'run_completed'])
    );
    expect(storedRun.steps.some(step => step.type === 'model' && step.status === 'completed')).toBe(true);
  });

  test('stores structured retrieval provenance on the run state', async () => {
    const runStore = new InMemoryRunStore();
    const rag = {
      searchWithProvenance: jest.fn().mockResolvedValue({
        query: 'Ground this answer',
        matches: [
          {
            id: 'doc-1',
            text: 'Grounding passage',
            score: 0.97,
            metadata: { source: 'handbook', documentId: 'doc-1' },
          },
        ],
      }),
    };

    const agent = new Agent(mockAdapter, { rag, runStore });
    const run = await agent.run('Ground this answer');

    expect(run.state.retrieval).toEqual({
      query: 'Ground this answer',
      matches: [
        expect.objectContaining({
          id: 'doc-1',
          text: 'Grounding passage',
          score: 0.97,
          metadata: expect.objectContaining({ source: 'handbook' }),
        }),
      ],
    });
  });

  test('pauses for approval and resumes the run after approval', async () => {
    const runStore = new InMemoryRunStore();
    const tool = new Tool({
      name: 'send_email',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
      metadata: {
        executionPolicy: 'require_approval',
      },
      implementation: async ({ query }) => ({ delivered: true, query }),
    });

    mockAdapter.generateText = jest.fn()
      .mockResolvedValueOnce({
        message: '',
        toolCalls: [{ name: 'send_email', arguments: { query: 'hello' }, id: 'tool_use_1' }],
      })
      .mockResolvedValueOnce({
        message: 'Email sent',
      });

    const agent = new Agent(mockAdapter, {
      tools: [tool],
      retryManager,
      runStore,
      toolPolicy: new ToolPolicy(),
    });

    const pendingRun = await agent.run('Use tool to send email');
    expect(pendingRun.status).toBe('waiting_for_approval');
    expect(pendingRun.pendingApproval.toolName).toBe('send_email');

    const resumedRun = await agent.resumeRun(pendingRun.id, { approved: true });
    expect(resumedRun.status).toBe('completed');
    expect(resumedRun.output).toBe('Email sent');
    expect(resumedRun.events.map(event => event.type)).toEqual(
      expect.arrayContaining([
        'approval_requested',
        'approval_resolved',
        'tool_started',
        'tool_completed',
        'run_completed',
      ])
    );
    expect(resumedRun.checkpoints.map(checkpoint => checkpoint.label)).toEqual(
      expect.arrayContaining(['waiting_for_approval', 'approval_resolved', 'tool_approved_and_resumed'])
    );
  });

  test('denies tool execution when policy returns deny', async () => {
    const tool = new Tool({
      name: 'delete_records',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
      implementation: async () => ({ ok: true }),
    });

    mockAdapter.generateText = jest.fn().mockResolvedValue({
      message: '',
      toolCalls: [{ name: 'delete_records', arguments: { query: 'all' }, id: 'tool_use_1' }],
    });

    const agent = new Agent(mockAdapter, {
      tools: [tool],
      retryManager,
      toolPolicy: new ToolPolicy({
        evaluate: () => ({ action: 'deny', reason: 'blocked in test' }),
      }),
    });

    await expect(agent.run('Use tool to delete')).rejects.toBeInstanceOf(ToolPolicyError);
  });

  test('pauses and resumes a run outside approval flow', async () => {
    const runStore = new InMemoryRunStore();
    const agent = new Agent(mockAdapter, { runStore });

    const pausedRun = await agent.run('Pause me', { pauseOn: ['after_prompt_build'] });
    expect(pausedRun.status).toBe('paused');
    expect(pausedRun.pendingPause).toEqual(
      expect.objectContaining({
        stage: 'after_prompt_build',
      })
    );

    const resumedRun = await agent.resumeRun(pausedRun.id);
    expect(resumedRun.status).toBe('completed');
    expect(resumedRun.output).toBe('Mock response');
    expect(resumedRun.events.map(event => event.type)).toEqual(
      expect.arrayContaining(['run_paused', 'run_resumed', 'run_completed'])
    );
  });

  test('can pause an existing persisted run manually', async () => {
    const runStore = new InMemoryRunStore();
    const agent = new Agent(mockAdapter, { runStore });
    const run = await agent.run('Manual pause target');

    await expect(
      agent.pauseRun(run.id, { reason: 'waiting on user', stage: 'manual' })
    ).rejects.toBeInstanceOf(RunPausedError);
  });

  test('can cancel a paused run and inspect metrics', async () => {
    const runStore = new InMemoryRunStore();
    const agent = new Agent(mockAdapter, { runStore });
    const pausedRun = await agent.run('Cancel me', { pauseOn: ['after_prompt_build'] });

    const cancelledRun = await agent.cancelRun(pausedRun.id, { reason: 'user stopped it' });
    expect(cancelledRun.status).toBe('cancelled');
    expect(cancelledRun.events.map(event => event.type)).toContain('run_cancelled');

    await expect(agent.resumeRun(cancelledRun.id)).rejects.toBeInstanceOf(RunCancelledError);

    const summary = agent.inspectRun(cancelledRun);
    expect(summary).toEqual(
      expect.objectContaining({
        id: cancelledRun.id,
        status: 'cancelled',
        metrics: expect.any(Object),
      })
    );
    expect(RunInspector.summarize(cancelledRun).status).toBe('cancelled');
  });

  test('emits events through the event bus sinks', async () => {
    const seen = [];
    const eventBus = new EventBus({
      sinks: [
        {
          handleEvent: async event => {
            seen.push(event.type);
          },
        },
      ],
    });
    const agent = new Agent(mockAdapter, { eventBus });

    await agent.run('Hello event bus');

    expect(seen).toEqual(
      expect.arrayContaining(['run_started', 'model_request', 'model_response', 'run_completed'])
    );
  });

  test('applies policy hooks before and after tool execution', async () => {
    const tool = new Tool({
      name: 'transform',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
      implementation: async ({ query }) => ({ query }),
    });

    mockAdapter.generateText = jest.fn()
      .mockResolvedValueOnce({
        message: '',
        toolCalls: [{ name: 'transform', arguments: { query: 'hello' }, id: 'tool_use_1' }],
      })
      .mockResolvedValueOnce({
        message: 'Transformed',
      });

    const agent = new Agent(mockAdapter, {
      tools: [tool],
      retryManager,
      toolPolicy: new ToolPolicy({
        beforeExecute: async () => ({ action: 'allow' }),
        afterExecute: async (_tool, result) => ({ ...result, transformed: true }),
      }),
    });

    const run = await agent.run('Use tool to transform');

    expect(run.status).toBe('completed');
    expect(run.toolResults).toEqual([
      expect.objectContaining({
        toolName: 'transform',
        result: { query: 'hello', transformed: true },
      }),
    ]);
  });
});
