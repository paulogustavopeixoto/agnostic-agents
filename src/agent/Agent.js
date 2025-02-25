// src/agent/Agent.js
const { RetryManager } = require('../utils/RetryManager');

class Agent {
  /**
   * @param {object} adapter - An instance of your provider adapter (OpenAIAdapter, GeminiAdapter, HFAdapter, etc.)
   * @param {object} options
   * @param {array}  options.tools - If using function calling
   * @param {object} options.memory - Optional memory instance
   * @param {object} options.defaultConfig - e.g. { model, temperature, maxTokens }
   * @param {string} options.description - Optional system instructions or agent description
   * @param {object} [options.rag] - Optional RAG instance for retrieval-augmented generation
   * @param {object} [options.retryManager] - Optional RetryManager instance for error handling (defaults to 3 retries)
   */
  constructor(adapter, { 
    tools = [], 
    memory = null, 
    defaultConfig = {}, 
    description = "", 
    rag = null, 
    retryManager = new RetryManager({ retries: 3, baseDelay: 1000, maxDelay: 10000 }) 
  } = {}) {
    this.adapter = adapter;
    this.tools = tools;
    this.memory = memory;
    this.defaultConfig = defaultConfig;
    this.description = description;
    this.rag = rag;
    this.retryManager = retryManager; // New: RetryManager for resilience
  }

  // Helper to build the system prompt from description and user input
  _buildSystemPrompt(userPrompt = "") {
    return {
      system: this.description || "",
      context: this.memory ? this.memory.getContext() : "",
      user: userPrompt || "",
    };
  }

  /**
   * Generic text-based prompt method with optional RAG retrieval.
   * @param {string} userMessage - The user's input message
   * @param {object} [config] - e.g. { model, temperature, maxTokens, useRag: boolean }
   * @returns {Promise<string>} - The agent's response
   */
  async sendMessage(userMessage, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const promptObject = this._buildSystemPrompt(userMessage);

    let result;
    if (this.rag && config.useRag !== false) { // Use RAG if present and not disabled
      result = await this.retryManager.execute(() => 
        this.rag.query(userMessage, { adapterOptions: finalConfig })
      );
    } else {
      result = await this.retryManager.execute(() => 
        this.adapter.generateText(promptObject, { ...finalConfig, tools: this.tools })
      );
    }

    if (!this.rag && result.toolCall) { // Skip tool calls with RAG (handled internally)
      const toolResult = await this.retryManager.execute(() => 
        this._handleToolCall(result.toolCall)
      );
      result = await this.retryManager.execute(() => 
        this.adapter.generateToolResult(promptObject, result.toolCall, toolResult, finalConfig)
      );
    }

    if (this.memory) {
      this.memory.store(userMessage, result);
    }

    return result;
  }

  /**
   * If the LLM requests a tool call, we find the matching tool and run it.
   * @param {object} toolCall - Tool call object from adapter
   * @returns {Promise<any>} - Tool execution result
   */
  async _handleToolCall(toolCall) {
    const toolInstance = this.tools.find((t) => t.name === toolCall.name);
    if (!toolInstance) throw new Error(`Tool ${toolCall.name} not found.`);
    return await toolInstance.call(toolCall.arguments || {});
  }

  /**
   * Analyze an image (if the adapter supports it).
   * @param {Buffer|string} imageData - Could be a URL or base64 string
   * @param {object} config - e.g. { prompt, model, temperature }
   * @returns {Promise<string>} - Image analysis result
   */
  async analyzeImage(imageData, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const userPrompt = config.prompt || "Analyze this image.";
    const promptObject = this._buildSystemPrompt(userPrompt);

    return await this.retryManager.execute(() => 
      this.adapter.analyzeImage(imageData, {
        ...finalConfig,
        prompt: promptObject,
      })
    );
  }

  /**
   * Generate an image (text -> image).
   * @param {string} userPrompt - The user's input for image generation
   * @param {object} config - e.g. { model, size, returnBase64 }
   * @returns {Promise<string|Buffer>} - Generated image (URL or base64)
   */
  async generateImage(userPrompt, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const promptObject = this._buildSystemPrompt(userPrompt);

    return await this.retryManager.execute(() => 
      this.adapter.generateImage(promptObject, finalConfig)
    );
  }
}

module.exports = { Agent };