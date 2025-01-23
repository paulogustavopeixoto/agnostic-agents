// src/providers/AnthropicAdapter.js
const { default: Anthropic } = require('@anthropic-ai/sdk');

class AnthropicAdapter {
  /**
   * @param {string} apiKey
   * @param {object} options
   * @param {string} [options.model] - e.g. "claude-2", "claude-instant-v1.1", "claude-3-5-sonnet-latest", etc.
   * @param {number} [options.maxRetries=2] - how many times to retry on 429 or 5xx
   * @param {number} [options.timeout=600000] - request timeout in ms
   */
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.client = new Anthropic({
      apiKey,
      maxRetries: options.maxRetries,
      timeout: options.timeout,
    });
    this.model = options.model || 'claude-2'; // fallback model
  }

  /**
   * Single-pass text generation with optional function calling (Anthropic calls them "tools").
   * @param {string} prompt
   * @param {object} config
   * @param {string} [config.model]
   * @param {number} [config.temperature=1]
   * @param {array}  [config.tools] - Array of your Tool objects
   */
  async generateText(prompt, { model, temperature = 1, tools = [] } = {}) {
    // Convert your Tools to Anthropic tools if present
    const anthropicTools = tools.map((tool) => tool.toAnthropicTool());

    // Construct the request
    const params = {
      model: model || this.model,
      messages: [
        { role: 'user', content: prompt },
      ],
      max_tokens: 1024,
      temperature,
      // Only add "tools" if we actually have some
      // (Anthropic expects an array or undefined).
      tools: anthropicTools.length > 0 ? anthropicTools : undefined,
    };

    // Make the API call
    const response = await this.client.messages.create(params);

    // Parse response
    // The response object typically has shape: 
    // {
    //   content: [ { type: 'text', text: 'some text' }, 
    //              { type: 'tool_use', name, arguments, ... }, ... ],
    //   stop_reason, usage, etc.
    // }
    let textContent = '';
    let toolCall = null;

    if (Array.isArray(response.content)) {
      for (const block of response.content) {
        // If it's plain text
        if (block.type === 'text') {
          textContent += block.text;
        }
        // If the model is requesting a tool call
        else if (block.type === 'tool_use') {
          toolCall = {
            name: block.name,
            arguments: block.arguments,
            // In Anthropic’s schema, "tool_use_id" also appears.
            // If needed, store it (block.tool_use_id).
          };
        }
      }
    }

    // If there's a tool call, return it so the Agent can handle it
    if (toolCall) {
      return {
        message: '',
        toolCall,
      };
    } else {
      // Normal text response
      return {
        message: textContent.trim(),
      };
    }
  }

  /**
   * Second-pass call if the first pass returned a tool call. 
   * We'll send the original prompt + a user message with {type:"tool_result"}.
   * @param {string} originalPrompt
   * @param {object} toolCall - { name, arguments, [id] }
   * @param {any} toolResult - The result from your tool’s implementation
   * @param {object} config
   */
  async generateToolResult(originalPrompt, toolCall, toolResult, config = {}) {
    const model = config.model || this.model;
    const temperature = config.temperature ?? 1;

    // Following Anthropic’s doc, you do a conversation containing:
    // 1) The original user message
    // 2) The assistant's tool usage
    // 3) A user "tool_result" message
    const messages = [
      { role: 'user', content: originalPrompt },
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            name: toolCall.name,
            arguments: toolCall.arguments,
            // tool_use_id: toolCall.id or a random ID if you want
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            // If you want to tie it to the ID from the first pass:
            tool_use_id: toolCall.id || 'tool_use_1234',
            content: [
              {
                type: 'text',
                text: JSON.stringify(toolResult),
              },
            ],
          },
        ],
      },
    ];

    const response = await this.client.messages.create({
      model,
      messages,
      temperature,
      max_tokens: 1024,
      // If you still want to allow further tool calls,
      // pass tools again:
      // tools: ...
    });

    // Now parse the second pass for either text or more tool calls
    let textContent = '';
    if (Array.isArray(response.content)) {
      for (const block of response.content) {
        if (block.type === 'text') {
          textContent += block.text;
        }
        // If you want to support nested calls (the bot calls a second tool):
        // else if (block.type === 'tool_use') { ... }
      }
    }

    return textContent.trim();
  }

  /**
   * Anthropic doesn’t currently provide image generation or image analysis.
   * These throw “not implemented” errors to match your other adapters.
   */
  async generateImage(prompt, config = {}) {
    throw new Error("Anthropic does not support direct image generation.");
  }

  async analyzeImage(imageData, config = {}) {
    throw new Error("Anthropic does not support image analysis natively.");
  }
}

module.exports = { AnthropicAdapter };