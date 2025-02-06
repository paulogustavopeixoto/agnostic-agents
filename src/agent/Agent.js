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
  constructor(adapter, { tools = [], memory = null, defaultConfig = {} } = {}) {
    this.adapter = adapter;
    this.tools = tools;
    this.memory = memory;
    this.defaultConfig = defaultConfig; 
    this.description = description;
  }

  /**
   * Generic text-based prompt method.
   * @param {string} userMessage 
   * @param {object} config - e.g. { model, temperature, maxTokens }
   */
  async sendMessage(userMessage, config = {}) {
    // 1) Merge config with defaults
    const finalConfig = { ...this.defaultConfig, ...config };

    // 2) Build or update memory
    const conversationContext = this.memory ? this.memory.getContext() : "";
    
    // Incorporate the system-level description if provided.
    const systemPrompt = this.description ? `System: ${this.description}\n` : "";
    const prompt = systemPrompt + conversationContext + "\nUser: " + userMessage + "\nAgent:";

    // 3) Possibly do function calling if the adapter supports it
    //    or just call generateText if you don’t detect a function call.
    const result = await this.adapter.generateText(prompt, {
      ...finalConfig,
      tools: this.tools, // if function calling is integrated
    });

    // 4) If there's a function/tool call:
    if (result.toolCall) {
      const toolResult = await this._handleToolCall(result.toolCall);
      //console.log("Tool result:", JSON.stringify(toolResult, null, 2));
      // Then feed toolResult back to the LLM for a final answer, etc.
      //return await this.adapter.generateToolResult(prompt, result.toolCall, toolResult, finalConfig);
      return toolResult;
    }

    // 5) Update memory with user + agent content
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
    // toolCall.arguments => pass to the tool's implementation
    return await toolInstance.call(toolCall.arguments || {});
  }

  /**
   * Analyze an image (if the adapter supports it).
   * @param {Buffer|string} imageData - Could be a file path, base64, or Buffer
   * @param {object} config 
   */
  async analyzeImage(imageData, config = {}) {
    // merges config with default
    const finalConfig = { ...this.defaultConfig, ...config };
    // calls adapter
    return await this.adapter.analyzeImage(imageData, finalConfig);
  }

  /**
   * Generate an image (text -> image).
   * e.g., stable diffusion or DALL·E
   */
  async generateImage(prompt, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    return await this.adapter.generateImage(prompt, finalConfig);
  }
}

module.exports = { Agent };