// src/llm/gemini.js 
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { BaseProvider } = require('./BaseProvider');
const { RetryManager } = require('../utils/RetryManager');

class GeminiAdapter extends BaseProvider {
  constructor(apiKey, config = {}) {
    super();
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = config.model || 'gemini-1.5-pro'; // Initialize model
    this.retryManager = new RetryManager({ retries: 3, baseDelay: 1000, maxDelay: 10000 });
  }

  async generateText(messages, config = {}) {
    // Validate and normalize messages
    let normalizedMessages = Array.isArray(messages) ? messages : [
      { role: 'user', content: typeof messages === 'string' ? messages : JSON.stringify(messages) }
    ];
    // Ensure each message has role and content
    normalizedMessages = normalizedMessages.map(m => ({
      role: m.role || 'user',
      content: m.content || ''
    }));

    const modelName = config.model || this.model;
    const model = this.genAI.getGenerativeModel({ model: modelName });
    const maxTokens = config.maxTokens || 1024;
    const tools = config.tools?.map(t => ({
      functionDeclarations: [{
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }],
    })) || [];

    const formattedMessages = normalizedMessages.map(m => ({
      role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
    }));

    const response = await this.retryManager.execute(async () => {
      const result = await model.generateContent({
        contents: formattedMessages,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: config.temperature || 0.7,
        },
        tools,
      });
      return result.response;
    });

    const message = response.text();
    const toolCalls = response.functionCalls?.map(fc => ({
      id: `call_${Date.now()}`,
      name: fc.name,
      arguments: fc.args,
    })) || [];

    return { message, toolCalls };
  }

  async generateToolResult(messages, toolCall, toolResult, config = {}) {
    // Validate messages
    let normalizedMessages = Array.isArray(messages) ? messages : [
      { role: 'user', content: typeof messages === 'string' ? messages : JSON.stringify(messages) }
    ];
    normalizedMessages = normalizedMessages.map(m => ({
      role: m.role || 'user',
      content: m.content || ''
    }));

    const modelName = config.model || this.model;
    const model = this.genAI.getGenerativeModel({ model: modelName });
    const maxTokens = config.maxTokens || 1024;

    const formattedMessages = normalizedMessages.map(m => ({
      role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
    })).concat({
      role: 'function',
      parts: [{ functionResponse: { name: toolCall.name, response: toolResult } }],
    });

    const response = await this.retryManager.execute(async () => {
      const result = await model.generateContent({
        contents: formattedMessages,
        generationConfig: { maxOutputTokens: maxTokens },
      });
      return result.response.text();
    });

    return response;
  }

  async analyzeImage(imageData, config = {}) {
    const modelName = config.model || this.model;
    const model = this.genAI.getGenerativeModel({ model: modelName });
    const maxTokens = config.maxTokens || 1024;
    const prompt = config.prompt || 'What’s in this image?';

    let dataUrl;
    if (Buffer.isBuffer(imageData)) {
      dataUrl = { mimeType: 'image/jpeg', data: imageData.toString('base64') };
    } else if (typeof imageData === 'string' && (imageData.startsWith('http') || imageData.startsWith('data:image/'))) {
      dataUrl = imageData;
    } else {
      throw new Error('Unsupported imageData format. Must be a URL, base64 string, or Buffer.');
    }

    const response = await this.retryManager.execute(async () => {
      const result = await model.generateContent([
        { text: typeof prompt === 'string' ? prompt : prompt.user || 'What’s in this image?' },
        { inlineData: typeof dataUrl === 'string' ? undefined : dataUrl, fileData: typeof dataUrl === 'string' ? { uri: dataUrl, mimeType: 'image/jpeg' } : undefined },
      ]);
      return result.response.text();
    });

    return response;
  }

  async embedChunks(texts, config = {}) {
    const modelName = config.model || 'text-embedding-004';
    const embedModel = this.genAI.getGenerativeModel({ model: modelName });

    const response = await this.retryManager.execute(async () => {
      const result = await embedModel.embedContent(texts.map(text => ({ content: { parts: [{ text }] } })));
      return result.embeddings.map(e => ({ embedding: e.values }));
    });

    return response;
  }

  async transcribeAudio(audioData, config = {}) {
    return await this.retryManager.execute(async () => {
      const modelName = config.model || this.model;
      const model = this.genAI.getGenerativeModel({ model: modelName });

      let audioContent;
      if (Buffer.isBuffer(audioData)) {
        audioContent = { inlineData: { mimeType: 'audio/wav', data: audioData.toString('base64') } };
      } else if (typeof audioData === 'string' && (audioData.startsWith('http') || audioData.startsWith('file://'))) {
        audioContent = { fileData: { uri: audioData, mimeType: 'audio/wav' } };
      } else {
        throw new Error('Unsupported audioData format. Must be a URL, file path, or Buffer.');
      }

      const response = await model.generateContent([
        { text: 'Transcribe this audio.' },
        audioContent,
      ]);

      return response.response.text();
    });
  }

  async generateAudio(text, config = {}) {
    throw new Error('Audio generation not supported by GeminiAdapter');
  }
}

module.exports = { GeminiAdapter };