// src/llm/huggingFace.js
const { HfInference } = require('@huggingface/inference');
const { BaseProvider } = require('./BaseProvider');
const { BoundedHttpClient } = require('../utils/BoundedHttpClient');
const { normalizeEmbeddingBatch } = require('./EmbeddingContract');
const fs = require('fs');
const path = require('path');

class HFAdapter extends BaseProvider {
  /**
   * @param {string} apiKey - Hugging Face API key
   * @param {object} options - Model selection options
   * @param {string} [options.textModel] - e.g., "mistralai/Mixtral-8x7B-Instruct-v0.1"
   * @param {string} [options.visionModel] - e.g., "Salesforce/blip-image-captioning-base"
   * @param {string} [options.imageGenModel] - e.g., "black-forest-labs/Flux.1-dev"
   * @param {number} [options.maxRetries=3] - Number of retries (passed to RetryManager)
   */
  constructor(apiKey, options = {}) {
    super({
      ...options,
      capabilities: {
        toolCalling: true,
        embeddings: true,
        imageAnalysis: true,
        imageGeneration: true,
        videoAnalysis: true,
      },
    });
    this.apiKey = apiKey;
    this.inference = new HfInference(apiKey, { retry_on_error: false });
    this.textModel = options.textModel || "mistralai/Mixtral-8x7B-Instruct-v0.1";
    this.visionModel = options.visionModel || "Salesforce/blip-image-captioning-base";
    this.imageGenModel = options.imageGenModel || "black-forest-labs/Flux.1-dev";
    this.baseUrl = options.baseUrl || 'https://api-inference.huggingface.co/models';
  }

  /**
   * Generate text with simulated tool calling via prompt instructions.
   * @param {object|array} promptObject - Prompt object {system, context, user} or message array
   * @param {object} options - {model, temperature, tools, maxTokens}
   * @returns {Promise<object>} - {message: string, toolCalls?: array}
   */
  async generateText(promptObject, { model, temperature = 0.7, tools = [], maxTokens = 12000, signal } = {}) {
    return await this.retryManager.execute(async () => {
      const messages = Array.isArray(promptObject) ? promptObject : [
        ...(promptObject.system ? [{ role: "system", content: promptObject.system }] : []),
        ...(promptObject.context ? [{ role: "user", content: promptObject.context }] : []),
        ...(promptObject.user ? [{ role: "user", content: promptObject.user }] : [])
      ];

      let fullPrompt = messages.map(msg => `${msg.role === "system" ? "System" : "User"}: ${msg.content}`).join("\n");
      if (tools.length > 0) {
        const toolDescriptions = tools.map(t => JSON.stringify(t.toOpenAIFunction())).join("\n");
        fullPrompt += `\nAvailable Tools:\n${toolDescriptions}\nTo call a tool, respond with JSON: {"toolCall": {"name": "tool_name", "arguments": {...}, "id": "tool_use_<timestamp>"}}`;
      }

      const result = await this.inference.textGeneration({
        model: model || this.textModel,
        inputs: fullPrompt,
        parameters: { max_new_tokens: maxTokens, temperature },
      }, { signal, retry_on_error: false });

      try {
        const parsed = JSON.parse(result.generated_text);
        if (parsed.toolCall) {
          return {
            message: "",
            toolCalls: [{ ...parsed.toolCall, id: parsed.toolCall.id || `tool_use_${Date.now()}` }]
          };
        }
      } catch (err) {
        // Not a JSON tool call; return as text
        // Plain text is a valid response; do not log private model output.
      }
      return { message: result.generated_text };
    });
  }

  /**
   * Handle a second pass for tool call results via prompt injection.
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
          content: JSON.stringify({ toolCall: { name: toolCall.name, arguments: toolCall.arguments, id: toolCall.id } })
        },
        {
          role: "function",
          content: JSON.stringify(toolResult)
        }
      ];

      const fullPrompt = messages.map(msg => `${msg.role === "system" ? "System" : msg.role === "function" ? "Tool Result" : "User"}: ${msg.content}`).join("\n") +
        "\nPlease provide a final answer using the tool result.";

      const result = await this.inference.textGeneration({
        model: config.model || this.textModel,
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: config.maxTokens || 12000,
          temperature: config.temperature || 0.7,
        },
      }, { signal: config.signal, retry_on_error: false });
      return result.generated_text;
    });
  }

  /**
   * Generate an image using a text-to-image model (e.g., Flux.1).
   * @param {object|array} promptObject - Prompt object or message array
   * @param {object} config - {model, maxTokens}
   * @returns {Promise<Buffer|string>} - Image as Buffer or base64
   */
  async generateImage(promptObject, config = {}) {
    return await this.retryManager.execute(async () => {
      const prompt = Array.isArray(promptObject)
        ? promptObject.filter(msg => msg.role === "user").map(msg => msg.content).join("\n")
        : `${promptObject.system ? `${promptObject.system}\n` : ""}${promptObject.context}${promptObject.user || ""}`.trim();

      const result = await this.inference.textToImage({
        model: config.model || this.imageGenModel,
        inputs: prompt,
      }, { signal: config.signal, retry_on_error: false });
      return result; // Buffer or base64
    });
  }

  /**
   * Analyze an image using an image-to-text model (e.g., BLIP).
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

      const result = await this.inference.imageToText({
        model: config.model || this.visionModel,
        data: imageData,
        parameters: { prompt },
      }, { signal: config.signal, retry_on_error: false });
      return result[0]?.generated_text || "No description generated.";
    });
  }

  /**
   * Generate embeddings for text chunks.
   * @param {string[]} chunks - Array of text chunks
   * @param {object} options - {model}
   * @returns {Promise<object[]>} - Array of embedding objects
   */
  async embedChunks(chunks, { model = "sentence-transformers/all-MiniLM-L6-v2", signal } = {}) {
    if (!Array.isArray(chunks) || !chunks.length || chunks.some(c => typeof c !== 'string' || !c.trim())) {
      throw new Error("embedChunks requires a non-empty array of non-empty strings.");
    }
    return await this.retryManager.execute(async () => {
      const embeddings = await Promise.all(chunks.map(async (chunk) => {
        const result = await this.inference.featureExtraction({
          model,
          inputs: chunk
        }, { signal, retry_on_error: false });
        return result;
      }));
      return normalizeEmbeddingBatch(embeddings, chunks.length);
    });
  }

  async transcribeAudio(audioData, config = {}) {
    throw this._unsupportedCapability('transcribeAudio');
  }

  async generateAudio(text, config = {}) {
    throw this._unsupportedCapability('generateAudio');
  }

  /**
   * Analyze a video and generate a description.
   * @param {Buffer|string} videoData - Video data as a Buffer, URL, or file path
   * @param {object} [options] - Configuration options {model, prompt, maxTokens}
   * @returns {Promise<string>} - Video description text
   */
  async analyzeVideo(videoData, config = {}) {
    if (!Buffer.isBuffer(videoData) && !(videoData instanceof Uint8Array)) {
      throw new TypeError('Unsupported file format or unsafe video source. Resolve an authorized artifact to bytes before analysis.');
    }
    const maxBytes = config.maxBytes ?? 16 * 1024 * 1024;
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 104857600 || videoData.byteLength > maxBytes) {
      throw new TypeError('Video exceeds bounded input size.');
    }
    const data = Buffer.from(videoData);
    const url = new URL(this.baseUrl);
    const client = new BoundedHttpClient({ origin: url.origin,
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/octet-stream' },
      maxBytes, timeoutMs: config.timeoutMs ?? 30000 });
    const model = config.model || 'microsoft/git-large-videocaption';
    if (typeof model !== 'string' || !/^[\w-]+\/[\w.-]+$/.test(model) || ['.', '..'].includes(model.split('/')[1])) {
      throw new TypeError('Invalid video model identifier.');
    }
    const modelPath = model.split('/').map(encodeURIComponent).join('/');
    const result = await client.request({ path: `${url.pathname.replace(/\/$/, '')}/${modelPath}`,
      rawBody: data, signal: config.signal });
    if (typeof result?.[0]?.generated_text !== 'string') throw new Error('Invalid video analysis response.');
    return result[0].generated_text;
  }

  /**
   * Generate a video from text.
   * @param {string} text - Text prompt for video generation
   * @param {object} [options] - Configuration options {model, format, duration}
   * @returns {Promise<Buffer|string>} - Video data as a Buffer or URL
   */
  async generateVideo(text, config = {}) {
    throw this._unsupportedCapability('generateVideo');
  }
}

module.exports = { HFAdapter };
