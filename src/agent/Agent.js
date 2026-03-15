const { RetryManager } = require('../utils/RetryManager');
const { MissingInfoResolver } = require('./MissingInfoResolver');
const {
  AdapterCapabilityError,
  InvalidToolCallError,
  ToolExecutionError,
  ToolNotFoundError,
} = require('../errors');

class Agent {
  /**
   * @param {object} adapter - Provider adapter with generateText/analyzeImage/etc.
   * @param {object} options
   * @param {Array|object} [options.tools] - Tool array, ToolRegistry instance, or { tools, triggers }
   * @param {object|null} [options.memory]
   * @param {object} [options.defaultConfig]
   * @param {string} [options.description]
   * @param {object|null} [options.rag]
   * @param {RetryManager} [options.retryManager]
   * @param {object|null} [options.mcpClient]
   * @param {Function|null} [options.askUser]
   */
  constructor(
    adapter,
    {
      tools = [],
      memory = null,
      defaultConfig = {},
      description = '',
      rag = null,
      retryManager = new RetryManager({ retries: 3, baseDelay: 1000, maxDelay: 10000 }),
      mcpClient = null,
      askUser = null,
    } = {}
  ) {
    this.adapter = adapter;
    this.toolRegistry = null;
    this.tools = this._normalizeTools(tools);
    this.memory = memory;
    this.defaultConfig = defaultConfig;
    this.description = description;
    this.rag = rag;
    this.retryManager = retryManager;
    this.mcpClient = mcpClient;
    this.resolver = new MissingInfoResolver({
      memory: this.memory,
      rag: this.rag,
      askUser,
      tools: this.tools,
    });
  }

  _normalizeTools(tools) {
    if (tools?.listTools && typeof tools.listTools === 'function') {
      this.toolRegistry = tools;
      return tools.listTools();
    }

    if (Array.isArray(tools)) {
      return [...tools];
    }

    if (tools?.tools && Array.isArray(tools.tools)) {
      return [...tools.tools];
    }

    throw new Error(
      '[Agent] Invalid tools input. Must be ToolRegistry instance, array, or { tools, triggers } object.'
    );
  }

  async _retrieveMemoryContext(userMessage) {
    if (!this.memory) {
      return '';
    }

    const facts = [];

    if (this.memory.entities && typeof this.memory.getEntity === 'function') {
      for (const key of Object.keys(this.memory.entities)) {
        const value = this.memory.getEntity(key);
        if (value) {
          facts.push(`${key}: ${value}`);
        }
      }
    }

    if (this.memory.vectorStore && typeof this.memory.searchSemanticMemory === 'function') {
      const semantic = await this.memory.searchSemanticMemory(userMessage);
      if (semantic) {
        facts.push(`Related info: ${semantic}`);
      }
    }

    return facts.length ? `Here is what I remember:\n${facts.join('\n')}\n` : '';
  }

  async _getRagContext(userMessage, config = {}) {
    if (!this.rag || config.useRag === false || typeof this.rag.search !== 'function') {
      return '';
    }

    try {
      const matches = await this.retryManager.execute(() =>
        this.rag.search(userMessage, config.ragOptions || {})
      );

      if (!Array.isArray(matches) || matches.length === 0) {
        return '';
      }

      return `Retrieved context:\n${matches.join('\n')}\n`;
    } catch (error) {
      return '';
    }
  }

  async _buildSystemPrompt(userPrompt = '', config = {}) {
    const memoryContext = await this._retrieveMemoryContext(userPrompt);
    const ragContext = await this._getRagContext(userPrompt, config);
    const now = new Date().toUTCString();
    const system = `${this.description || ''}\nCurrent date and time is: ${now}\n`.trim();
    const conversationContext = this.memory?.getContext?.() || '';
    const context = `${conversationContext}${conversationContext && (memoryContext || ragContext) ? '\n' : ''}${memoryContext}${ragContext}`.trim();

    return {
      system,
      context,
      user: userPrompt || '',
    };
  }

  _promptObjectToMessages(promptObject) {
    const messages = [];

    if (promptObject.system) {
      messages.push({ role: 'system', content: promptObject.system });
    }

    if (promptObject.context) {
      messages.push({ role: 'user', content: promptObject.context });
    }

    if (promptObject.user) {
      messages.push({ role: 'user', content: promptObject.user });
    }

    return messages;
  }

  registerTools(tools) {
    const nextTools =
      tools?.listTools && typeof tools.listTools === 'function'
        ? tools.listTools()
        : Array.isArray(tools)
          ? tools
          : [tools];

    this.tools.push(...nextTools);
    this.resolver.tools = this.tools;
  }

  async sendMessage(userMessage, config = {}) {
    if (!this.adapter?.generateText) {
      throw new AdapterCapabilityError('Agent requires an adapter with generateText().');
    }

    const finalConfig = { ...this.defaultConfig, ...config };
    const promptObject = await this._buildSystemPrompt(userMessage, finalConfig);
    const messages = this._promptObjectToMessages(promptObject);

    if (messages.length === 0) {
      throw new InvalidToolCallError('Cannot send empty prompt: No messages in the array.');
    }

    let result;

    while (true) {
      result = await this.retryManager.execute(() =>
        this.adapter.generateText(messages, { ...finalConfig, tools: this.tools })
      );

      const toolCalls = result?.toolCalls || (result?.toolCall ? [result.toolCall] : []);
      if (!toolCalls.length) {
        break;
      }

      for (const toolCall of toolCalls) {
        this._validateToolCall(toolCall);

        const toolResult = await this.retryManager.execute(() => this._handleToolCall(toolCall));

        messages.push({
          role: 'assistant',
          content: '',
          function_call: {
            name: toolCall.name,
            arguments: JSON.stringify(toolCall.arguments || {}),
          },
        });
        messages.push({
          role: 'function',
          name: toolCall.name,
          content: JSON.stringify(toolResult),
        });
      }
    }

    if (this.memory?.storeConversation) {
      this.memory.storeConversation(userMessage, result.message || JSON.stringify(result));
    } else if (this.memory?.store) {
      this.memory.store(userMessage, result);
    }

    return result?.message || result;
  }

  _validateToolCall(toolCall) {
    if (!toolCall?.name || typeof toolCall.arguments !== 'object' || toolCall.arguments === null) {
      throw new InvalidToolCallError('Invalid tool call format: missing name or arguments');
    }
  }

  async _handleToolCall(toolCall) {
    const toolInstance = this.tools.find(tool => tool.name === toolCall.name);
    if (!toolInstance) {
      throw new ToolNotFoundError(`Tool ${toolCall.name} not found.`);
    }

    const resolvedArgs = await this.resolver.resolve(toolInstance, toolCall.arguments || {});
    try {
      return await toolInstance.call(resolvedArgs, { toolCall });
    } catch (error) {
      throw new ToolExecutionError(
        `Tool "${toolCall.name}" failed: ${error.message || String(error)}`
      );
    }
  }

  async analyzeImage(imageData, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const promptObject = await this._buildSystemPrompt(config.prompt || 'Analyze this image.', finalConfig);

    return this.retryManager.execute(() =>
      this.adapter.analyzeImage(imageData, {
        ...finalConfig,
        prompt: promptObject,
      })
    );
  }

  async generateImage(userPrompt, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const promptObject = await this._buildSystemPrompt(userPrompt, finalConfig);

    return this.retryManager.execute(() => this.adapter.generateImage(promptObject, finalConfig));
  }

  async transcribeAudio(audioData, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    return this.retryManager.execute(() => this.adapter.transcribeAudio(audioData, finalConfig));
  }

  async generateAudio(text, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    return this.retryManager.execute(() => this.adapter.generateAudio(text, finalConfig));
  }

  async analyzeVideo(videoData, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const promptObject = await this._buildSystemPrompt(config.prompt || 'Describe this video.', finalConfig);

    return this.retryManager.execute(() =>
      this.adapter.analyzeVideo(videoData, {
        ...finalConfig,
        prompt: promptObject,
      })
    );
  }

  async generateVideo(text, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const promptObject = await this._buildSystemPrompt(text, finalConfig);

    return this.retryManager.execute(() => this.adapter.generateVideo(promptObject.user, finalConfig));
  }

  async init() {
    if (!this.mcpClient || typeof this.mcpClient.toTools !== 'function') {
      return;
    }

    try {
      const mcpTools = await this.mcpClient.toTools();
      if (Array.isArray(mcpTools) && mcpTools.length) {
        this.tools.push(...mcpTools);
        this.resolver.tools = this.tools;
      }
    } catch (error) {
      console.warn('[Agent] Failed to load MCP tools:', error.message);
    }
  }
}

module.exports = { Agent };
