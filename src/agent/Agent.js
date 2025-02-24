// src/agent/Agent.js
class Agent {
  /**
   * @param {object} adapter - An instance of your provider adapter (OpenAIAdapter, GeminiAdapter, HFAdapter, etc.)
   * @param {object} options
   * @param {array}  options.tools - If using function calling
   * @param {object} options.memory - Optional memory instance
   * @param {object} options.defaultConfig - e.g. { model, temperature, maxTokens } 
   * @param {string} options.description - Optional system instructions or agent description.
   */
  constructor(adapter, { tools = [], memory = null, defaultConfig = {}, description = "" } = {}) {
    this.adapter = adapter;
    this.tools = tools;
    this.memory = memory;
    this.defaultConfig = defaultConfig;
    this.description = description;
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
   * Generic text-based prompt method.
   * @param {string} userMessage - The user's input message
   * @param {object} config - e.g. { model, temperature, maxTokens }
   */
  async sendMessage(userMessage, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const promptObject = this._buildSystemPrompt(userMessage);

    const result = await this.adapter.generateText(promptObject, {
      ...finalConfig,
      tools: this.tools,
    });

    if (result.toolCall) {
      const toolResult = await this._handleToolCall(result.toolCall);
      return await this.adapter.generateToolResult(promptObject, result.toolCall, toolResult, finalConfig);
    }

    if (this.memory) {
      this.memory.store(userMessage, result.message);
    }

    return result.message;
  }

  /**
   * If the LLM requests a tool call, we find the matching tool and run it.
   */
  async _handleToolCall(toolCall) {
    const toolInstance = this.tools.find((t) => t.name === toolCall.name);
    if (!toolInstance) {
      throw new Error(`Tool ${toolCall.name} not found.`);
    }
    return await toolInstance.call(toolCall.arguments || {});
  }

  /**
   * Analyze an image (if the adapter supports it).
   * @param {Buffer|string} imageData - Could be a URL or base64 string
   * @param {object} config - e.g. { prompt, model, temperature }
   */
  async analyzeImage(imageData, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const userPrompt = config.prompt || "Analyze this image.";
    const promptObject = this._buildSystemPrompt(userPrompt);

    return await this.adapter.analyzeImage(imageData, {
      ...finalConfig,
      prompt: promptObject, 
    });
  }

  /**
   * Generate an image (text -> image).
   * e.g., stable diffusion or DALL·E
   * @param {string} userPrompt - The user's input for image generation
   * @param {object} config - e.g. { model, size, returnBase64 }
   */
  async generateImage(userPrompt, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const promptObject = this._buildSystemPrompt(userPrompt);

    return await this.adapter.generateImage(promptObject, finalConfig);
  }
}

module.exports = { Agent };