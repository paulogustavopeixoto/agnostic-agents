// src/llm/deepSeek.js
const { OpenAI } = require("openai");
const { BaseProvider } = require('./BaseProvider');

class DeepSeekAdapter extends BaseProvider {
  /**
   * @param {string} apiKey - DeepSeek API key
   * @param {object} options
   * @param {string} [options.model] - e.g., "deepseek-chat"
   * @param {number} [options.maxRetries=3] - Number of retries (passed to RetryManager)
   */
  constructor(apiKey, options = {}) {
    super(options); // Initialize BaseProvider with retryManager
    this.apiKey = apiKey;
    this.openai = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey });
    this.model = options.model || 'deepseek-chat';
  }

  /**
   * Generate text via chat-completion with optional function calling (tools).
   * @param {object|array} promptObject - Prompt object {system, context, user} or message array
   * @param {object} options - {model, temperature, tools, maxTokens}
   * @returns {Promise<object>} - {message: string, toolCalls?: array}
   */
  async generateText(promptObject, { model, temperature = 0.7, tools = [], maxTokens = 1024 } = {}) {
    return await this.retryManager.execute(async () => {
      const openAIFunctions = tools.map((tool) => tool.toOpenAIFunction());
      const messages = Array.isArray(promptObject) ? promptObject : [
        ...(promptObject.system ? [{ role: "system", content: promptObject.system }] : []),
        ...(promptObject.context ? [{ role: "user", content: promptObject.context }] : []),
        ...(promptObject.user ? [{ role: "user", content: promptObject.user }] : [])
      ];

      const completion = await this.openai.chat.completions.create({
        model: model || this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        functions: openAIFunctions.length > 0 ? openAIFunctions : undefined,
        function_call: openAIFunctions.length > 0 ? "auto" : undefined,
      });

      const choice = completion.choices[0].message;
      if (choice.function_call) {
        try {
          const parsed = JSON.parse(choice.function_call.arguments || "{}");
          return {
            message: "",
            toolCalls: [{
              name: choice.function_call.name,
              arguments: parsed,
              id: choice.function_call.id || `tool_use_${Date.now()}`
            }],
          };
        } catch (err) {
          console.error("Failed to parse function_call arguments:", err);
          return {
            message: choice.content || "",
            toolCalls: [{ name: choice.function_call.name, arguments: {}, id: `tool_use_${Date.now()}` }],
          };
        }
      }
      return { message: choice.content || "" };
    });
  }

  /**
   * Handle a second pass for tool call results.
   * @param {object|array} promptObject - Prompt object or message array
   * @param {object} toolCall - Tool call details {name, arguments, id}
   * @param {any} toolResult - Tool execution result
   * @param {object} config - {model, temperature, maxTokens}
   * @returns {Promise<string>} - Final response
   */
  async generateToolResult(promptObject, toolCall, toolResult, config = {}) {
    return await this.retryManager.execute(async () => {
      const messages = Array.isArray(promptObject) ? promptObject : [
        ...(promptObject.system ? [{ role: "system", content: promptObject.system }] : []),
        ...(promptObject.context ? [{ role: "user", content: promptObject.context }] : []),
        ...(promptObject.user ? [{ role: "user", content: promptObject.user }] : []),
        {
          role: "assistant",
          content: "",
          function_call: { name: toolCall.name, arguments: JSON.stringify(toolCall.arguments) },
        },
        {
          role: "function",
          name: toolCall.name,
          content: JSON.stringify(toolResult),
        },
      ];

      const completion = await this.openai.chat.completions.create({
        model: config.model || this.model,
        messages,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 1024,
      });

      return completion.choices[0].message.content || "";
    });
  }

  /**
   * DeepSeek doesn’t support image generation.
   */
  async generateImage(promptObject, config = {}) {
    throw new Error("DeepSeek does not support image generation.");
  }

  /**
   * DeepSeek doesn’t support image analysis.
   */
  async analyzeImage(imageData, config = {}) {
    throw new Error("DeepSeek does not support image analysis.");
  }

  /**
   * Generate embeddings for text chunks.
   * @param {string[]} chunks - Array of text chunks
   * @param {object} options - {model}
   * @returns {Promise<object[]>} - Array of embedding objects
   */
  async embedChunks(chunks, { model = "text-embedding" } = {}) {
    if (!Array.isArray(chunks) || !chunks.length || chunks.some(c => typeof c !== 'string' || !c.trim())) {
      throw new Error("embedChunks requires a non-empty array of non-empty strings.");
    }
    return await this.retryManager.execute(async () => {
      const response = await this.openai.embeddings.create({
        model,
        input: chunks,
        encoding_format: "float",
      });
      return response.data;
    });
  }

  async transcribeAudio(audioData, config = {}) {
    throw new Error('Audio transcription not supported by DeepSeekAdapter');
  }

  async generateAudio(text, config = {}) {
    throw new Error('Audio generation not supported by DeepSeekAdapter');
  }
}

module.exports = { DeepSeekAdapter };