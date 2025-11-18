// src/llm/anthropic.js
const { Anthropic } = require('@anthropic-ai/sdk');
const { BaseProvider } = require('./BaseProvider');

class AnthropicAdapter extends BaseProvider {
  /**
   * @param {string} apiKey - Anthropic API key
   * @param {object} options
   * @param {string} [options.model] - e.g., "claude-3-5-sonnet-20240620"
   * @param {number} [options.maxRetries=3] - Number of retries (passed to RetryManager)
   * @param {number} [options.timeout=600000] - Timeout in milliseconds (not used; handled by RetryManager)
   */
  constructor(apiKey, options = {}) {
    super(options); // Initialize BaseProvider with retryManager
    this.apiKey = apiKey;
    this.client = new Anthropic({ apiKey }); // Remove built-in retries
    this.model = options.model || 'claude-3-5-sonnet-20240620';
  }

  /**
   * Single-pass text generation with optional function calling (tools).
   * @param {object|array} promptObject - Prompt object {system, context, user} or message array
   * @param {object} options - {model, temperature, tools, maxTokens}
   * @returns {Promise<object>} - {message: string, toolCalls?: array}
   */
  async generateText(promptObject, { model, temperature = 1, tools = [], maxTokens = 1024 } = {}) {
    return await this.retryManager.execute(async () => {
      const anthropicTools = tools.map((tool) => tool.toAnthropicTool());
      const messages = Array.isArray(promptObject) ? promptObject : [
        ...(promptObject.context ? [{ role: "user", content: promptObject.context }] : []),
        ...(promptObject.user ? [{ role: "user", content: promptObject.user }] : [])
      ];

      const params = {
        model: model || this.model,
        system: Array.isArray(promptObject) ? undefined : promptObject.system || undefined,
        messages,
        max_tokens: maxTokens,
        temperature,
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      };

      const response = await this.client.messages.create(params);

      let textContent = '';
      const toolCalls = [];

      if (Array.isArray(response.content)) {
        for (const block of response.content) {
          if (block.type === 'text') {
            textContent += block.text;
          } else if (block.type === 'tool_use') {
            toolCalls.push({
              name: block.name,
              arguments: block.input, // MCP uses input
              id: block.id
            });
          }
        }
      }

      if (toolCalls.length > 0) {
        return { message: '', toolCalls };
      }
      return { message: textContent.trim() };
    });
  }

  /**
   * Second-pass call for tool call results.
   * @param {object|array} promptObject - Prompt object or message array
   * @param {object} toolCall - Tool call details {name, arguments, id}
   * @param {any} toolResult - Tool execution result
   * @param {object} config - {model, temperature, maxTokens}
   * @returns {Promise<string>} - Final response
   */
  async generateToolResult(promptObject, toolCall, toolResult, config = {}) {
    return await this.retryManager.execute(async () => {
      const model = config.model || this.model;
      const temperature = config.temperature ?? 1;
      const maxTokens = config.maxTokens || 1024;

      const messages = Array.isArray(promptObject) ? promptObject : [
        ...(promptObject.context ? [{ role: "user", content: promptObject.context }] : []),
        ...(promptObject.user ? [{ role: "user", content: promptObject.user }] : []),
        {
          role: "assistant",
          content: [{
            type: "tool_use",
            id: toolCall.id || 'tool_use_1234',
            name: toolCall.name,
            input: toolCall.arguments // MCP uses input
          }],
        },
        {
          role: "user",
          content: [{
            type: "tool_result",
            tool_use_id: toolCall.id || 'tool_use_1234',
            content: JSON.stringify(toolResult)
          }],
        }
      ];

      const response = await this.client.messages.create({
        model,
        system: Array.isArray(promptObject) ? undefined : promptObject.system || undefined,
        messages,
        temperature,
        max_tokens: maxTokens,
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
    });
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

  /**
   * Anthropic doesn’t support embeddings.
   */
  async embedChunks(chunks, options = {}) {
    throw new Error("Anthropic does not support embeddings.");
  }

  /**
   * Anthropic doesn’t support Audio transcription.
   */
  async transcribeAudio(audioData, config = {}) {
    throw new Error('Audio transcription not supported by AnthropicAdapter');
  }

  /**
   * Anthropic doesn’t support Audio generation.
   */
  async generateAudio(text, config = {}) {
    throw new Error('Audio generation not supported by AnthropicAdapter');
  }
}

module.exports = { AnthropicAdapter };