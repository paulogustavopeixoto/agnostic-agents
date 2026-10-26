// src/llm/anthropic.js
const { Anthropic } = require('@anthropic-ai/sdk');
const { BaseProvider } = require('./BaseProvider');
const { anthropicMessages, completionState } = require('./ProviderMessages');

class AnthropicAdapter extends BaseProvider {
  /**
   * @param {string} apiKey - Anthropic API key
   * @param {object} options
   * @param {string} [options.model] - e.g., "claude-3-5-sonnet-20240620"
   * @param {number} [options.maxRetries=3] - Number of retries (passed to RetryManager)
   * @param {number} [options.timeout=600000] - Timeout in milliseconds (not used; handled by RetryManager)
   */
  constructor(apiKey, options = {}) {
    super({
      ...options,
      capabilities: {
        toolCalling: true,
      },
    });
    this.apiKey = apiKey;
    this.client = new Anthropic({ apiKey, maxRetries: 0 });
    this.model = options.model || 'claude-3-5-sonnet-20240620';
  }

  /**
   * Single-pass text generation with optional function calling (tools).
   * @param {object|array} promptObject - Prompt object {system, context, user} or message array
   * @param {object} options - {model, temperature, tools, maxTokens}
   * @returns {Promise<object>} - {message: string, toolCalls?: array}
   */
  async generateText(promptObject, { model, temperature = 1, tools = [], maxTokens = 1024, signal } = {}) {
    return await this.retryManager.execute(async () => {
      const anthropicTools = tools.map((tool) => tool.toAnthropicTool());
      const { messages, system } = anthropicMessages(promptObject);

      const params = {
        model: model || this.model,
        system,
        messages,
        max_tokens: maxTokens,
        temperature,
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      };

      const response = await this.client.messages.create(params, { signal });
      const state = completionState(response.stop_reason);
      const usage = response.usage ? { prompt: response.usage.input_tokens || 0,
        completion: response.usage.output_tokens || 0,
        total: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0) } : undefined;

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
        return { message: '', toolCalls, ...state, usage };
      }
      return { message: textContent.trim(), ...state, usage };
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

      const legacy = Array.isArray(promptObject) ? promptObject : [
        ...(promptObject.system ? [{ role: 'system', content: promptObject.system }] : []),
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

      const { messages, system } = anthropicMessages(legacy);

      const response = await this.client.messages.create({
        model,
        system,
        messages,
        temperature,
        max_tokens: maxTokens,
      }, { signal: config.signal });

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
    throw this._unsupportedCapability('generateImage');
  }

  /**
   * Anthropic doesn’t support image analysis.
   */
  async analyzeImage(imageData, config = {}) {
    throw this._unsupportedCapability('analyzeImage');
  }

  /**
   * Anthropic doesn’t support embeddings.
   */
  async embedChunks(chunks, options = {}) {
    throw this._unsupportedCapability('embedChunks');
  }

  /**
   * Anthropic doesn’t support Audio transcription.
   */
  async transcribeAudio(audioData, config = {}) {
    throw this._unsupportedCapability('transcribeAudio');
  }

  /**
   * Anthropic doesn’t support Audio generation.
   */
  async generateAudio(text, config = {}) {
    throw this._unsupportedCapability('generateAudio');
  }
}

module.exports = { AnthropicAdapter };
