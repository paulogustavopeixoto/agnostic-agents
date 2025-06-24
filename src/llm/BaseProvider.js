// src/llm/BaseProvider.js
class BaseProvider {
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
    throw new Error('generateToolResult must be implemented by subclass');
  }

  /**
   * Analyze an image and generate a description.
   * @param {Buffer|string} imageData - Image data as a Buffer, URL, or base64 string
   * @param {object} [options] - Configuration options {model, prompt, maxTokens}
   * @returns {Promise<string>} - Image description text
   */
  async analyzeImage(imageData, config = {}) {
    throw new Error('analyzeImage must be implemented by subclass');
  }

  /**
   * Generate embeddings for text chunks.
   * @param {string[]} chunks - Array of text chunks
   * @param {object} [options] - Configuration options {model}
   * @returns {Promise<object[]>} - Array of embedding objects
   */
  async embedChunks(texts, config = {}) {
    throw new Error('embedChunks must be implemented by subclass');
  }

  /**
   * Transcribe audio data to text.
   * @param {Buffer|string} audioData - Audio data as a Buffer, URL, or file path
   * @param {object} [options] - Configuration options {model, language}
   * @returns {Promise<string>} - Transcribed text
   */
  async transcribeAudio(audioData, config = {}) {
    throw new Error('transcribeAudio must be implemented by subclass');
  }

  /**
   * Generate audio from text (text-to-speech).
   * @param {string} text - Text to convert to audio
   * @param {object} [options] - Configuration options {model, voice, format}
   * @returns {Promise<Buffer>} - Audio data as a Buffer
   */
  async generateAudio(text, config = {}) {
    throw new Error('generateAudio must be implemented by subclass');
  }

  /**
   * Analyze a video and generate a description.
   * @param {Buffer|string} videoData - Video data as a Buffer, URL, or file path
   * @param {object} [options] - Configuration options {model, prompt, maxTokens}
   * @returns {Promise<string>} - Video description text
   */
  async analyzeVideo(videoData, config = {}) {
    throw new Error('analyzeVideo must be implemented by subclass');
  }

  /**
   * Generate a video from text.
   * @param {string} text - Text prompt for video generation
   * @param {object} [options] - Configuration options {model, format, duration}
   * @returns {Promise<Buffer|string>} - Video data as a Buffer or URL
   */
  async generateVideo(text, config = {}) {
    throw new Error('generateVideo must be implemented by subclass');
  }
}

module.exports = { BaseProvider };