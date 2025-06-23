// src/llm/OpenAi.js
const { OpenAI } = require("openai");
const { BaseProvider } = require('./BaseProvider');

class OpenAIAdapter extends BaseProvider {
  /**
   * @param {string} apiKey - OpenAI API key
   * @param {object} options - Configuration options
   * @param {string} [options.model] - e.g., "gpt-4o-mini"
   * @param {number} [options.maxRetries=3] - Number of retries (passed to RetryManager)
   */
  constructor(apiKey, options = {}) {
    super(options); // Initialize BaseProvider with retryManager
    this.apiKey = apiKey;
    this.openai = new OpenAI({ apiKey });
    this.model = options.model || "gpt-4o-mini";
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
   * Generate an image using a text-to-image model (e.g., DALL·E).
   * @param {object|array} promptObject - Prompt object or message array
   * @param {object} config - {model, size, returnBase64, n, maxTokens}
   * @returns {Promise<string[]|string>} - Array of image URLs or base64 strings
   */
  async generateImage(promptObject, { model = "dall-e-3", size = "1024x1024", returnBase64 = false, n = 1, maxTokens = 1024 } = {}) {
    return await this.retryManager.execute(async () => {
      const prompt = Array.isArray(promptObject)
        ? promptObject.filter(msg => msg.role === "user").map(msg => msg.content).join("\n")
        : `${promptObject.system ? `${promptObject.system}\n` : ""}${promptObject.context}${promptObject.user || ""}`.trim();

      const response = await this.openai.images.generate({
        model,
        prompt,
        n,
        size,
      });

      if (!returnBase64) {
        return response.data.map(img => img.url);
      }

      const base64Array = await Promise.all(response.data.map(async (image) => {
        const res = await fetch(image.url);
        if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
        const arrayBuffer = await res.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return `data:image/png;base64,${base64}`;
      }));

      return base64Array;
    });
  }

  /**
   * Analyze an image using a vision model (e.g., GPT-4o).
   * @param {string|Buffer} imageData - URL, base64, or Buffer
   * @param {object} config - {prompt, model, maxTokens}
   * @returns {Promise<string>} - Image analysis result
   */
  async analyzeImage(imageData, config = {}) {
    return await this.retryManager.execute(async () => {
      const model = config.model || this.model;
      const promptObject = config.prompt || { user: "What's in this image?" };
      const maxTokens = config.maxTokens || 1024;

      let dataUrl = "";
      if (Buffer.isBuffer(imageData)) {
        const base64 = imageData.toString("base64");
        dataUrl = `data:image/jpeg;base64,${base64}`;
      } else if (typeof imageData === "string") {
        const lower = imageData.toLowerCase();
        if (lower.startsWith("data:image/") || lower.startsWith("http")) {
          dataUrl = imageData;
        } else {
          throw new Error("Unsupported imageData format. Must be a URL or base64 string.");
        }
      } else {
        throw new Error("Unsupported imageData format. Must be a URL, base64 string, or Buffer.");
      }

      // Build messages array
      const messages = [];
      if (Array.isArray(promptObject)) {
        // Extract text content from prompt messages
        for (const msg of promptObject) {
          if (msg.role === "system") {
            messages.push({ role: "system", content: msg.content });
          } else if (msg.role === "user") {
            messages.push({
              role: "user",
              content: [
                { type: "text", text: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content) },
              ],
            });
          }
        }
      } else {
        // Handle object-based prompt
        if (promptObject.system) {
          messages.push({ role: "system", content: promptObject.system });
        }
        if (promptObject.context) {
          messages.push({ role: "user", content: [{ type: "text", text: promptObject.context }] });
        }
        messages.push({
          role: "user",
          content: [
            { type: "text", text: promptObject.user || "What's in this image?" },
          ],
        });
      }

      // Add image to the last user message
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        lastMessage.content.push({
          type: "image_url",
          image_url: { url: dataUrl, detail: "high" },
        });
      } else {
        messages.push({
          role: "user",
          content: [
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        });
      }

      const response = await this.openai.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
      });

      return response.choices[0].message.content || "";
    });
  }

  /**
   * Generate embeddings for text chunks.
   * @param {string[]} chunks - Array of text chunks
   * @param {object} options - {model}
   * @returns {Promise<object[]>} - Array of embedding objects
   */
  async embedChunks(chunks, { model = "text-embedding-ada-002" } = {}) {
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
}

module.exports = { OpenAIAdapter };