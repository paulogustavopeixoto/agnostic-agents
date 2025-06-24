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

  /**
   * Analyze a video and generate a description.
   * @param {Buffer|string} videoData - Video data as a Buffer, URL, or file path
   * @param {object} [options] - Configuration options {model, prompt, maxTokens}
   * @returns {Promise<string>} - Video description text
   */
  async analyzeVideo(videoData, config = {}) {
    return await this.retryManager.execute(async () => {
      const model = this.genAI.getGenerativeModel({ model: config.model || this.model });
      const promptObject = config.prompt || { user: 'Describe this video.' };
      const maxTokens = config.maxTokens || 1024;
      const supportedFormats = ['mp4', 'mov', 'mpeg', 'avi', 'webm'];
      let videoContent;

      if (Buffer.isBuffer(videoData)) {
        const tempPath = path.join(__dirname, `temp-video-${Date.now()}.mp4`);
        fs.writeFileSync(tempPath, videoData);
        videoContent = {
          fileData: {
            fileUri: `file://${tempPath}`,
            mimeType: 'video/mp4',
          },
        };
        fs.unlinkSync(tempPath);
      } else if (typeof videoData === 'string') {
        if (videoData.startsWith('http') || videoData.startsWith('file://')) {
          videoContent = {
            fileData: {
              fileUri: videoData,
              mimeType: 'video/mp4',
            },
          };
        } else {
          const ext = path.extname(videoData).toLowerCase().slice(1);
          if (!supportedFormats.includes(ext)) {
            throw new Error(`Unsupported file format: ${ext}. Supported formats: ${supportedFormats.join(', ')}`);
          }
          videoContent = {
            fileData: {
              fileUri: `file://${videoData}`,
              mimeType: `video/${ext === 'mov' ? 'mov' : 'mp4'}`,
            },
          };
        }
      } else {
        throw new Error('Unsupported videoData format. Must be a URL, file path, or Buffer.');
      }

      const promptParts = [];
      if (promptObject.system) promptParts.push(promptObject.system);
      if (promptObject.context) promptParts.push(promptObject.context);
      promptParts.push(promptObject.user || 'Describe this video.');

      const response = await model.generateContent([
        ...promptParts.map(text => ({ text })),
        videoContent,
      ]);

      return response.response.candidates[0].content.parts[0].text || '';
    });
  }

  /**
   * Generate a video from text.
   * @param {string} text - Text prompt for video generation
   * @param {object} [options] - Configuration options {model, format, duration}
   * @returns {Promise<Buffer>} - Video data as a Buffer
   */
  async generateVideo(text, config = {}) {
    return await this.retryManager.execute(async () => {
      const model = config.model || 'veo-2.0-generate-001';
      const format = config.format || 'mp4';
      const duration = config.duration || 10; // Default duration in seconds
      const aspectRatio = config.aspectRatio || '16:9';

      // Start video generation operation
      let operation = await this.genAI.models.generateVideos({
        model,
        prompt: text,
        config: {
          personGeneration: config.personGeneration || 'dont_allow',
          aspectRatio,
        },
      });

      // Poll until operation is complete
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        operation = await this.genAI.operations.getVideosOperation({
          operation,
        });
      }

      if (!operation.response?.generatedVideos?.length) {
        throw new Error('No video generated');
      }

      // Fetch the first generated video
      const videoUri = operation.response.generatedVideos[0].video?.uri;
      if (!videoUri) {
        throw new Error('No video URI returned');
      }

      const response = await fetch(`${videoUri}&key=${this.genAI.apiKey}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }

      // Convert response body to Buffer
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    });
  }
}

module.exports = { GeminiAdapter };