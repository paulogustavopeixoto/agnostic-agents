// src/agent/Agent.js
const { RetryManager } = require('../utils/RetryManager');
const { Tool } = require('./Tool');
const { MCPTool } = require('../tools/MCPTool');
const { MissingInfoResolver } = require('./MissingInfoResolver');
const { ToolValidator } = require('../utils/ToolValidator');

class Agent {
  /**
   * @param {object} adapter - An instance of your provider adapter (OpenAIAdapter, GeminiAdapter, HFAdapter, etc.)
   * @param {object} options
   * @param {Tool[] | ToolRegistry} options.tools - Array of tools or a ToolRegistry instance
   * @param {object} options.memory - Optional memory instance
   * @param {object} options.defaultConfig - e.g. { model, temperature, maxTokens }
   * @param {string} options.description - Optional system instructions or agent description
   * @param {object} [options.rag] - Optional RAG instance for retrieval-augmented generation
   * @param {object} [options.retryManager] - Optional RetryManager instance for error handling (defaults to 3 retries)
   */
  constructor(adapter, { 
    tools = [], 
    memory = null, 
    defaultConfig = {}, 
    description = "", 
    rag = null, 
    retryManager = new RetryManager({ retries: 3, baseDelay: 1000, maxDelay: 10000 }),
    mcpClient = null,
    askUser = null
  } = {}) {
    this.adapter = adapter;
    if (tools.list && typeof tools.list === 'function') {
      // It's a ToolRegistry instance
      this.toolRegistry = tools;
      this.tools = this.toolRegistry.list();
    } else {
      this.toolRegistry = null;
      this.tools = tools.map(tool => tool instanceof Tool ? tool : new Tool(tool));
    }
    this.memory = memory;
    this.defaultConfig = defaultConfig;
    this.description = description;
    this.rag = rag;
    this.retryManager = retryManager;
    this.mcpClient = mcpClient;
    this.validator = new ToolValidator();
    this.resolver = new MissingInfoResolver({
      memory: this.memory,
      rag: this.rag,
      askUser: askUser,  
    });
  }

  /**
   * Dynamically add more tools at runtime.
   * @param {Tool | Tool[] | ToolRegistry} tools 
   */
  registerTools(tools) {
    if (tools.list && typeof tools.list === 'function') {
      // ToolRegistry
      this.toolRegistry = tools;
      this.tools = tools.list();
    } else {
      const array = Array.isArray(tools) ? tools : [tools];
      this.tools.push(...array);
    }
  }

  // Helper to build the system prompt from description and user input
  _buildSystemPrompt(userPrompt = "") {
    return {
      system: this.description || "",
      context: this.memory ? this.memory.getContext() : "",
      user: userPrompt || "",
    };
  }

  // Helper to format error messages for LLMs
  _formatErrorForLLM(toolName, error) {
    const errorMessage = error.message || String(error);

    return `⚠️ The tool "${toolName}" failed with error:\n"${errorMessage}".\n` +
          `Would you like me to try again with different parameters or take another action?`;
  }

  /**
   * Generic text-based prompt method with optional RAG retrieval.
   * @param {string} userMessage - The user's input message
   * @param {object} [config] - e.g. { model, temperature, maxTokens, useRag: boolean }
   * @returns {Promise<string>} - The agent's response
   */
  async sendMessage(userMessage, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const promptObject = this._buildSystemPrompt(userMessage);

    let messages = Array.isArray(promptObject) ? promptObject : [
      { role: 'system', content: promptObject.system },
      { role: 'user', content: promptObject.context + promptObject.user }
    ];
    
    let result;

    while (true) {
      if (this.rag && config.useRag !== false) {
        result = await this.retryManager.execute(() =>
          this.rag.query(userMessage, { adapterOptions: finalConfig })
        );
      } else {
        result = await this.retryManager.execute(() =>
          this.adapter.generateText(promptObject, { ...finalConfig, tools: this.tools })
        );
      }

      if (!result.toolCalls?.length && !result.toolCall) break;

      const toolCalls = result.toolCalls || [result.toolCall];

      for (const toolCall of toolCalls) {
        let toolResult;

        try {
          toolResult = await this.retryManager.execute(() =>
            this._handleToolCall(toolCall)
          );
        } catch (err) {
          console.warn(`[Agent] Tool "${toolCall.name}" failed with error:`, err);

          const errorMsg = this._formatErrorForLLM(toolCall.name, err);
          messages.push({ role: 'assistant', content: errorMsg });

          // Add the error to user context so the LLM can reason about it
          promptObject.user += `\nTool "${toolCall.name}" failed with error: ${err.message}\n`;

          continue; // Let the loop continue to LLM for the next suggestion
        }

        messages.push(
          {
            role: 'assistant',
            content: '',
            function_call: {
              name: toolCall.name,
              arguments: JSON.stringify(toolCall.arguments)
            }
          },
          {
            role: 'function',
            name: toolCall.name,
            content: JSON.stringify(toolResult)
          }
        );

        promptObject.user += `\nTool ${toolCall.name} result: ${JSON.stringify(toolResult)}`;
      }
    }

    if (this.memory) {
      this.memory.store(userMessage, result);
    }

    return result.message || result;
  }

  /**
   * If the LLM requests a tool call, we find the matching tool and run it.
   * @param {object} toolCall - Tool call object from adapter
   * @returns {Promise<any>} - Tool execution result
   */
  async _handleToolCall(toolCall) {
    const toolInstance = this.tools.find(t => t.name === toolCall.name);
    if (!toolInstance) {
      throw new Error(`Tool ${toolCall.name} not found.`);
    }

    try {
      const resolvedArgs = await this.resolver.resolve(toolInstance, toolCall.arguments || {});
      const result = await toolInstance.call(resolvedArgs);
      return result;
    } catch (err) {
      console.warn(`[Agent] Tool "${toolCall.name}" failed with error:`, err);

      return {
        success: false,
        error: err.message,
        suggestion: `I couldn't execute "${toolCall.name}". This tool might need manual setup or isn't fully supported yet.`,
      };
    }
  }

  /**
   * Analyze an image (if the adapter supports it).
   * @param {Buffer|string} imageData - Could be a URL or base64 string
   * @param {object} config - e.g. { prompt, model, temperature }
   * @returns {Promise<string>} - Image analysis result
   */
  async analyzeImage(imageData, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const userPrompt = config.prompt || "Analyze this image.";
    const promptObject = this._buildSystemPrompt(userPrompt);

    return await this.retryManager.execute(() => 
      this.adapter.analyzeImage(imageData, {
        ...finalConfig,
        prompt: promptObject,
      })
    );
  }

  /**
   * Generate an image (text -> image).
   * @param {string} userPrompt - The user's input for image generation
   * @param {object} config - e.g. { model, size, returnBase64 }
   * @returns {Promise<string|Buffer>} - Generated image (URL or base64)
   */
  async generateImage(userPrompt, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const promptObject = this._buildSystemPrompt(userPrompt);

    return await this.retryManager.execute(() => 
      this.adapter.generateImage(promptObject, finalConfig)
    );
  }

  /**
   * Transcribe audio data to text (if the adapter supports it).
   * @param {Buffer|string} audioData - Audio data as a Buffer, URL, or file path
   * @param {object} [config] - Configuration options {model, language}
   * @returns {Promise<string>} - Transcribed text
   */
  async transcribeAudio(audioData, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    return await this.retryManager.execute(() =>
      this.adapter.transcribeAudio(audioData, finalConfig)
    );
  }

  /**
   * Generate audio from text (text-to-speech, if the adapter supports it).
   * @param {string} text - Text to convert to audio
   * @param {object} [config] - Configuration options {model, voice, format}
   * @returns {Promise<Buffer>} - Audio data as a Buffer
   */
  async generateAudio(text, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    return await this.retryManager.execute(() =>
      this.adapter.generateAudio(text, finalConfig)
    );
  }

  /**
   * Analyze a video and generate a description (if the adapter supports it).
   * @param {Buffer|string} videoData - Video data as a Buffer, URL, or file path
   * @param {object} [config] - Configuration options {model, prompt, maxTokens}
   * @returns {Promise<string>} - Video description text
   */
  async analyzeVideo(videoData, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const userPrompt = config.prompt || "Describe this video.";
    const promptObject = this._buildSystemPrompt(userPrompt);

    return await this.retryManager.execute(() =>
      this.adapter.analyzeVideo(videoData, {
        ...finalConfig,
        prompt: promptObject,
      })
    );
  }

  /**
   * Generate a video from text (if the adapter supports it).
   * @param {string} text - Text prompt for video generation
   * @param {object} [config] - Configuration options {model, format, duration}
   * @returns {Promise<Buffer|string>} - Video data as a Buffer or URL
   */
  async generateVideo(text, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const promptObject = this._buildSystemPrompt(text);

    return await this.retryManager.execute(() =>
      this.adapter.generateVideo(promptObject.user, finalConfig)
    );
  }
}

module.exports = { Agent };