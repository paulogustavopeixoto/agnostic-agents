// src/llm/BaseProvider.js
const { RetryManager } = require('../utils/RetryManager');

class BaseProvider {
  constructor(options = {}) {
    this.retryManager = options.retryManager || new RetryManager({
      retries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    });
  }

  async generateText(promptObject, options) {
    throw new Error('generateText not implemented');
  }

  async generateToolResult(promptObject, toolCall, toolResult, options) {
    throw new Error('generateToolResult not implemented');
  }

  async generateImage(promptObject, config) {
    throw new Error('generateImage not implemented');
  }

  async analyzeImage(imageData, config) {
    throw new Error('analyzeImage not implemented');
  }

  async embedChunks(chunks, options) {
    throw new Error('embedChunks not implemented');
  }

  async transcribeAudio(audioData, config = {}) {
    throw new Error('transcribeAudio must be implemented by subclass');
  }

  async generateAudio(text, config = {}) {
    throw new Error('generateAudio must be implemented by subclass');
  }
}

module.exports = { BaseProvider };