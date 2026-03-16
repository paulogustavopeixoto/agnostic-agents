// src/llm/BaseProvider.js
const { RetryManager } = require('../utils/RetryManager');
const { AdapterCapabilityError } = require('../errors');

const METHOD_CAPABILITY_MAP = {
  generateToolResult: 'toolCalling',
  analyzeImage: 'imageAnalysis',
  generateImage: 'imageGeneration',
  embedChunks: 'embeddings',
  transcribeAudio: 'audioTranscription',
  generateAudio: 'audioGeneration',
  analyzeVideo: 'videoAnalysis',
  generateVideo: 'videoGeneration',
};

class BaseProvider {
  constructor({
    retryManager = new RetryManager({ retries: 3, baseDelay: 1000, maxDelay: 10000 }),
    capabilities = {},
  } = {}) {
    this.retryManager = retryManager;
    this.capabilities = {
      generateText: true,
      toolCalling: false,
      embeddings: false,
      imageAnalysis: false,
      imageGeneration: false,
      audioTranscription: false,
      audioGeneration: false,
      videoAnalysis: false,
      videoGeneration: false,
      ...capabilities,
    };
  }

  getCapabilities() {
    return { ...this.capabilities };
  }

  supports(capability) {
    return Boolean(this.capabilities?.[capability]);
  }

  _unsupportedCapability(methodName) {
    const capability = METHOD_CAPABILITY_MAP[methodName];
    if (!capability) {
      return new Error(`${methodName} must be implemented by subclass`);
    }

    return new AdapterCapabilityError(
      `${this.constructor.name} does not support ${methodName}().`
    );
  }

  /**
   * Generate text based on input messages.
   * @param {object[]|string} messages - Array of message objects or a single string
   * @param {object} [options] - Configuration options {model, maxTokens, temperature, tools}
   * @returns {Promise<object>} - Object containing message and optional toolCalls
   */
  async generateText(messages, config = {}) {
    throw new Error('generateText must be implemented by subclass');
  }

  /**
   * Generate result for a tool call.
   * @param {object[]} messages - Array of message objects
   * @param {object} toolCall - Tool call details {id, name, arguments}
   * @param {object} toolResult - Result of tool execution
   * @param {object} [options] - Configuration options {model, maxTokens}
   * @returns {Promise<string>} - Generated text response
   */
  async generateToolResult(messages, toolCall, toolResult, config = {}) {
    if (!this.supports('toolCalling')) {
      throw this._unsupportedCapability('generateToolResult');
    }

    throw new Error('generateToolResult must be implemented by subclass');
  }

  /**
   * Analyze an image and generate a description.
   * @param {Buffer|string} imageData - Image data as a Buffer, URL, or base64 string
   * @param {object} [options] - Configuration options {model, prompt, maxTokens}
   * @returns {Promise<string>} - Image description text
   */
  async analyzeImage(imageData, config = {}) {
    throw this._unsupportedCapability('analyzeImage');
  }

  /**
   * Generate embeddings for text chunks.
   * @param {string[]} chunks - Array of text chunks
   * @param {object} [options] - Configuration options {model}
   * @returns {Promise<object[]>} - Array of embedding objects
   */
  async embedChunks(texts, config = {}) {
    throw this._unsupportedCapability('embedChunks');
  }

  /**
   * Transcribe audio data to text.
   * @param {Buffer|string} audioData - Audio data as a Buffer, URL, or file path
   * @param {object} [options] - Configuration options {model, language}
   * @returns {Promise<string>} - Transcribed text
   */
  async transcribeAudio(audioData, config = {}) {
    throw this._unsupportedCapability('transcribeAudio');
  }

  /**
   * Generate audio from text (text-to-speech).
   * @param {string} text - Text to convert to audio
   * @param {object} [options] - Configuration options {model, voice, format}
   * @returns {Promise<Buffer>} - Audio data as a Buffer
   */
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
    throw this._unsupportedCapability('analyzeVideo');
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

  async generateImage(promptObject, config = {}) {
    throw this._unsupportedCapability('generateImage');
  }
}

module.exports = { BaseProvider };
