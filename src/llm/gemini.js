// src/llm/gemini.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { BaseProvider } = require('./BaseProvider');

class GeminiAdapter extends BaseProvider {
  /**
   * @param {string} apiKey - Google Generative AI API key
   * @param {object} options
   * @param {string} [options.model] - e.g., "gemini-1.5-flash"
   * @param {number} [options.maxRetries=3] - Number of retries (passed to RetryManager)
   */
  constructor(apiKey, options = {}) {
    super(options); // Initialize BaseProvider with retryManager
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = options.model || "gemini-1.5-flash";
  }

  /**
   * Generate text with optional function calling (tools).
   * @param {object|array} promptObject - Prompt object {system, context, user} or message array
   * @param {object} options - {model, temperature, tools, maxTokens}
   * @returns {Promise<object>} - {message: string, toolCalls?: array}
   */
  async generateText(promptObject, { model, temperature = 0.7, tools = [], maxTokens = 1024 } = {}) {
    return await this.retryManager.execute(async () => {
      const functionDeclarations = tools.map((tool) => tool.toGeminiFunctionDeclaration());
      const modelConfig = {
        model: model || this.modelName,
        temperature,
        maxOutputTokens: maxTokens,
        ...(functionDeclarations.length > 0 ? {
          tools: { functionDeclarations },
          toolConfig: { functionCallingConfig: { mode: "ANY" } }
        } : {})
      };

      const messages = Array.isArray(promptObject) ? promptObject : [
        ...(promptObject.system ? [{ role: "user", parts: [{ text: promptObject.system }] }] : []),
        ...(promptObject.context ? [{ role: "user", parts: [{ text: promptObject.context }] }] : []),
        ...(promptObject.user ? [{ role: "user", parts: [{ text: promptObject.user }] }] : [])
      ];

      const model = this.genAI.getGenerativeModel(modelConfig);
      const chat = model.startChat({
        history: messages.map(msg => ({
          role: msg.role === "user" ? "user" : "model",
          parts: Array.isArray(msg.content) ? msg.content : [{ text: msg.content }]
        }))
      });

      const result = await chat.sendMessage(messages[messages.length - 1]?.content || "");
      const response = await result.response;
      const candidate = response?.candidates?.[0];
      if (!candidate) return { message: "" };

      const parts = candidate.content?.parts || [];
      const toolCalls = parts
        .filter(p => p.functionCall)
        .map(p => ({
          name: p.functionCall.name,
          arguments: p.functionCall.args,
          id: `tool_use_${Date.now()}`
        }));

      if (toolCalls.length > 0) {
        return { message: "", toolCalls };
      }

      const textParts = parts
        .filter(p => p.text)
        .map(p => p.text)
        .join("\n");

      return { message: textParts };
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
        ...(promptObject.system ? [{ role: "user", parts: [{ text: promptObject.system }] }] : []),
        ...(promptObject.context ? [{ role: "user", parts: [{ text: promptObject.context }] }] : []),
        ...(promptObject.user ? [{ role: "user", parts: [{ text: promptObject.user }] }] : []),
        {
          role: "model",
          parts: [{
            functionCall: {
              name: toolCall.name,
              args: toolCall.arguments,
            },
          }],
        },
        {
          role: "function",
          parts: [{
            functionResponse: {
              name: toolCall.name,
              response: { content: JSON.stringify(toolResult) },
            },
          }],
        }
      ];

      const model = this.genAI.getGenerativeModel({
        model: config.model || this.modelName,
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 1024,
      });

      const chat = model.startChat({
        history: messages.map(msg => ({
          role: msg.role === "user" ? "user" : msg.role === "model" ? "model" : "function",
          parts: Array.isArray(msg.content) ? msg.content : [{ text: msg.content }]
        }))
      });

      const finalResult = await chat.sendMessage("Please use the function result to provide a final answer.");
      const response = await finalResult.response;
      const candidate = response?.candidates?.[0];
      if (!candidate) return "";

      const parts = candidate.content?.parts || [];
      const textParts = parts
        .filter(p => p.text)
        .map(p => p.text)
        .join("\n");

      return textParts;
    });
  }

  /**
   * Generate an image using Gemini’s vision models (e.g., gemini-1.5-pro).
   * @param {object|array} promptObject - Prompt object or message array
   * @param {object} config - {model, maxTokens}
   * @returns {Promise<string>} - Image URL or base64
   */
  async generateImage(promptObject, config = {}) {
    return await this.retryManager.execute(async () => {
      const prompt = Array.isArray(promptObject)
        ? promptObject.filter(msg => msg.role === "user").map(msg => msg.content).join("\n")
        : `${promptObject.system ? `${promptObject.system}\n` : ""}${promptObject.context}${promptObject.user || ""}`.trim();

      const model = this.genAI.getGenerativeModel({
        model: config.model || "gemini-1.5-pro",
        maxOutputTokens: config.maxTokens || 1024,
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const candidate = response?.candidates?.[0];
      if (!candidate) throw new Error("Image generation failed: no candidate response.");

      const parts = candidate.content?.parts || [];
      const textParts = parts
        .filter(p => p.text)
        .map(p => p.text)
        .join("\n");

      // Note: Gemini doesn’t natively generate images; this assumes text-based description or future API support
      return textParts || "Image generation not fully supported.";
    });
  }

  /**
   * Analyze an image using Gemini’s vision models (e.g., gemini-1.5-pro).
   * @param {string|Buffer} imageData - URL, base64, or Buffer
   * @param {object} config - {prompt, model, maxTokens}
   * @returns {Promise<string>} - Image analysis result
   */
  async analyzeImage(imageData, config = {}) {
    return await this.retryManager.execute(async () => {
      const promptObject = config.prompt || { user: "Describe this image." };
      const prompt = Array.isArray(promptObject)
        ? promptObject.filter(msg => msg.role === "user").map(msg => msg.content).join("\n")
        : `${promptObject.system ? `${promptObject.system}\n` : ""}${promptObject.context}${promptObject.user || "Describe this image."}`.trim();

      let content;
      if (Buffer.isBuffer(imageData)) {
        content = [{ inlineData: { data: imageData.toString("base64"), mimeType: "image/jpeg" } }, { text: prompt }];
      } else if (typeof imageData === "string" && (imageData.startsWith("http") || imageData.startsWith("data:image/"))) {
        content = [{ url: imageData }, { text: prompt }];
      } else {
        throw new Error("Unsupported imageData format. Must be a URL, base64 string, or Buffer.");
      }

      const model = this.genAI.getGenerativeModel({
        model: config.model || "gemini-1.5-pro",
        maxOutputTokens: config.maxTokens || 1024,
      });

      const result = await model.generateContent(content);
      const response = await result.response;
      const candidate = response?.candidates?.[0];
      if (!candidate) return "No description generated.";

      const parts = candidate.content?.parts || [];
      const textParts = parts
        .filter(p => p.text)
        .map(p => p.text)
        .join("\n");

      return textParts || "No description generated.";
    });
  }

  /**
   * Generate embeddings for text chunks.
   * @param {string[]} chunks - Array of text chunks
   * @param {object} options - {model}
   * @returns {Promise<object[]>} - Array of embedding objects
   */
  async embedChunks(chunks, { model = "embedding-001" } = {}) {
    if (!Array.isArray(chunks) || !chunks.length || chunks.some(c => typeof c !== 'string' || !c.trim())) {
      throw new Error("embedChunks requires a non-empty array of non-empty strings.");
    }
    return await this.retryManager.execute(async () => {
      const modelInstance = this.genAI.getGenerativeModel({ model });
      const embeddings = await Promise.all(chunks.map(async (chunk) => {
        const result = await modelInstance.embedContent(chunk);
        return result.embedding;
      }));
      return embeddings;
    });
  }
}

module.exports = { GeminiAdapter };