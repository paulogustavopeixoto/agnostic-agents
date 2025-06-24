// src/llm/huggingFace.js
const { HfInference } = require('@huggingface/inference');
const { BaseProvider } = require('./BaseProvider');

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
    super(options); // Initialize BaseProvider with retryManager
    this.apiKey = apiKey;
    this.inference = new HfInference(apiKey);
    this.textModel = options.textModel || "mistralai/Mixtral-8x7B-Instruct-v0.1";
    this.visionModel = options.visionModel || "Salesforce/blip-image-captioning-base";
    this.imageGenModel = options.imageGenModel || "black-forest-labs/Flux.1-dev";
  }

  /**
   * Generate text with simulated tool calling via prompt instructions.
   * @param {object|array} promptObject - Prompt object {system, context, user} or message array
   * @param {object} options - {model, temperature, tools, maxTokens}
   * @returns {Promise<object>} - {message: string, toolCalls?: array}
   */
  async generateText(promptObject, { model, temperature = 0.7, tools = [], maxTokens = 12000 } = {}) {
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
      });

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
        console.warn("HFAdapter: Failed to parse tool call response; treating as text:", err.message);
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
      });
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
      });
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
      });
      return result[0]?.generated_text || "No description generated.";
    });
  }

  /**
   * Generate embeddings for text chunks.
   * @param {string[]} chunks - Array of text chunks
   * @param {object} options - {model}
   * @returns {Promise<object[]>} - Array of embedding objects
   */
  async embedChunks(chunks, { model = "sentence-transformers/all-MiniLM-L6-v2" } = {}) {
    if (!Array.isArray(chunks) || !chunks.length || chunks.some(c => typeof c !== 'string' || !c.trim())) {
      throw new Error("embedChunks requires a non-empty array of non-empty strings.");
    }
    return await this.retryManager.execute(async () => {
      const embeddings = await Promise.all(chunks.map(async (chunk) => {
        const result = await this.inference.featureExtraction({
          model,
          inputs: chunk
        });
        return result;
      }));
      return embeddings;
    });
  }

  async transcribeAudio(audioData, config = {}) {
    throw new Error('Audio transcription not supported by HuggingFaceAdapter');
  }

  async generateAudio(text, config = {}) {
    throw new Error('Audio generation not supported by HuggingFaceAdapter');
  }

  /**
   * Analyze a video and generate a description.
   * @param {Buffer|string} videoData - Video data as a Buffer, URL, or file path
   * @param {object} [options] - Configuration options {model, prompt, maxTokens}
   * @returns {Promise<string>} - Video description text
   */
  async analyzeVideo(videoData, config = {}) {
    return await this.retryManager.execute(async () => {
      const model = config.model || 'microsoft/git-large-videocaption'; // Hypothetical model
      const promptObject = config.prompt || { user: 'Describe this video.' };
      let data;

      if (Buffer.isBuffer(videoData)) {
        const tempPath = path.join(__dirname, `temp-video-${Date.now()}.mp4`);
        fs.writeFileSync(tempPath, videoData);
        data = fs.readFileSync(tempPath);
        fs.unlinkSync(tempPath);
      } else if (typeof videoData === 'string') {
        if (videoData.startsWith('http') || videoData.startsWith('file://')) {
          const response = await fetch(videoData);
          data = Buffer.from(await response.arrayBuffer());
        } else {
          const ext = path.extname(videoData).toLowerCase().slice(1);
          const supportedFormats = ['mp4', 'avi', 'mov', 'webm'];
          if (!supportedFormats.includes(ext)) {
            throw new Error(`Unsupported file format: ${ext}. Supported formats: ${supportedFormats.join(', ')}`);
          }
          data = fs.readFileSync(videoData);
        }
      } else {
        throw new Error('Unsupported videoData format. Must be a URL, file path, or Buffer.');
      }

      const response = await fetch(`${this.baseUrl}/${model}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: data,
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.statusText}`);
      }

      const result = await response.json();
      return result[0]?.generated_text || promptObject.user;
    });
  }

  /**
   * Generate a video from text.
   * @param {string} text - Text prompt for video generation
   * @param {object} [options] - Configuration options {model, format, duration}
   * @returns {Promise<Buffer|string>} - Video data as a Buffer or URL
   */
  async generateVideo(text, config = {}) {
    throw new Error('Video generation not supported by HuggingFaceAdapter');
  }
}

module.exports = { HFAdapter };