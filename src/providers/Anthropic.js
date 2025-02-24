// src/providers/Anthropic.js
const { Anthropic } = require('@anthropic-ai/sdk');

class AnthropicAdapter {
  /**
   * @param {string} apiKey
   * @param {object} options
   * @param {string} [options.model] - e.g., "claude-3-5-sonnet-20240620"
   * @param {number} [options.maxRetries=2]
   * @param {number} [options.timeout=600000]
   */
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.client = new Anthropic({
      apiKey,
      maxRetries: options.maxRetries || 2,
      timeout: options.timeout || 600000,
    });
    this.model = options.model || 'claude-3-5-sonnet-20240620'; // Updated default to a current model
  }

  /**
   * Single-pass text generation with optional function calling (tools).
   */
  async generateText(promptObject, { model, temperature = 1, tools = [] } = {}) {
    const anthropicTools = tools.map((tool) => tool.toAnthropicTool());

    const messages = [];
    if (promptObject.context) messages.push({ role: "user", content: promptObject.context });
    if (promptObject.user) messages.push({ role: "user", content: promptObject.user });

    const params = {
      model: model || this.model,
      system: promptObject.system || undefined, // Use native system parameter
      messages,
      max_tokens: 1024,
      temperature,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined,
    };

    const response = await this.client.messages.create(params);

    let textContent = '';
    let toolCall = null;

    if (Array.isArray(response.content)) {
      for (const block of response.content) {
        if (block.type === 'text') {
          textContent += block.text;
        } else if (block.type === 'tool_use') {
          toolCall = {
            name: block.name,
            arguments: block.arguments,
          };
        }
      }
    }

    if (toolCall) {
      return { message: '', toolCall };
    }
    return { message: textContent.trim() };
  }

  /**
   * Second-pass call for tool call results.
   */
  async generateToolResult(promptObject, toolCall, toolResult, config = {}) {
    const model = config.model || this.model;
    const temperature = config.temperature ?? 1;

    const messages = [];
    if (promptObject.context) messages.push({ role: "user", content: promptObject.context });
    if (promptObject.user) messages.push({ role: "user", content: promptObject.user });
    messages.push({
      role: "assistant",
      content: [{
        type: "tool_use",
        name: toolCall.name,
        arguments: toolCall.arguments,
        id: toolCall.id || 'tool_use_1234', // Anthropic requires an ID
      }],
    });
    messages.push({
      role: "user",
      content: [{
        type: "tool_result",
        tool_use_id: toolCall.id || 'tool_use_1234', // Match the ID
        content: JSON.stringify(toolResult),
      }],
    });

    const response = await this.client.messages.create({
      model,
      system: promptObject.system || undefined, // Use native system parameter
      messages,
      temperature,
      max_tokens: 1024,
    });

    let textContent = '';
    if (Array.isArray(response.content)) {
      for (const block of response.content) {
        if (block.type === 'text') {
          textContent += block.text;
        }
      }
    }

    return textContent.trim();
  }

  /**
   * Anthropic doesn’t support image generation.
   */
  async generateImage(promptObject, config = {}) {
    throw new Error("Anthropic does not support image generation.");
  }

  /**
   * Anthropic doesn’t support image analysis.
   */
  async analyzeImage(imageData, config = {}) {
    throw new Error("Anthropic does not support image analysis.");
  }
}

module.exports = { AnthropicAdapter };