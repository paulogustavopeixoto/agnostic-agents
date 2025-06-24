// examples/openai-test.js
const { Agent, Tool, OpenAIAdapter, MCPTool } = require('../index');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Mock Memory class (replace with `Memory` if implemented)
class MockMemory {
  getContext() {
    return 'Mock context';
  }

  store(userMessage, result) {
    this.lastStored = { userMessage, result };
  }
}

// Mock MCP server setup (run inline for testing)
const startMockMCPServer = () => {
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.post('/execute', (req, res) => {
    const { tool, input } = req.body;
    res.json({ result: `Mock MCP result for ${tool}: ${JSON.stringify(input)}` });
  });
  return app.listen(3000, () => console.log('Mock MCP server on port 3000'));
};

(async () => {
  // Start mock MCP server
  let server;
  try {
    server = startMockMCPServer();
  } catch (error) {
    console.error('Failed to start mock MCP server:', error.message);
    process.exit(1);
  }

  try {
    // 1) Instantiate the adapter
    if (!process.env.OPENAI_API_KEY) {
      console.error('Please set OPENAI_API_KEY in your .env file.');
      process.exit(1);
    }
    const openai = new OpenAIAdapter(process.env.OPENAI_API_KEY);

    // 2) Define tools
    const getWeatherTool = new Tool({
      name: 'get_weather',
      description: 'Get current temperature for a given location.',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City, e.g. Bogotá, Colombia' },
        },
        required: ['location'],
      },
      implementation: async ({ location }) => {
        return { location, temperature: '18°C' };
      },
    });

    const mcpSearchTool = new MCPTool({
      name: 'web_search',
      description: 'Search the web for information.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
      endpoint: 'http://localhost:3000',
      apiKey: 'test-key',
    });

    // Test 1: Generate Text with Function Calling and MCP
    console.log('\n=== Test 1: Generate Text with Function Calling and MCP ===');
    const agentWithTools = new Agent(openai, {
      tools: [getWeatherTool, mcpSearchTool],
      memory: new MockMemory(),
      description: 'You’re a versatile assistant handling weather and web searches.',
      defaultConfig: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 1024 },
    });
    const functionCallPrompt = 'Get the weather in Paris, France, and search for recent AI news.';
    const functionCallResponse = await agentWithTools.sendMessage(functionCallPrompt);
    console.log('Function Call Response:', functionCallResponse);

    // Test 2: Generate Text without Function Calling
    console.log('\n=== Test 2: Generate Text without Function Calling ===');
    const agentSimple = new Agent(openai, {
      description: 'You’re a friendly chatbot.',
      defaultConfig: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 512 },
    });
    const simplePrompt = 'Hello, how are you today?';
    const simpleResponse = await agentSimple.sendMessage(simplePrompt);
    console.log('Simple Text Response:', simpleResponse);

    // Test 3: Analyze Image
    console.log('\n=== Test 3: Analyze Image ===');
    const imageAgent = new Agent(openai, {
      description: 'You’re an art critic.',
      defaultConfig: { model: 'gpt-4o-mini', maxTokens: 1024 },
    });
    const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Portrait_of_Sir_Isaac_Newton%2C_1689_%28brightened%29.jpg/1920px-Portrait_of_Sir_Isaac_Newton%2C_1689_%28brightened%29.jpg';
    const imageAnalysis = await imageAgent.analyzeImage(imageUrl, {
      prompt: 'Describe this image in detail, focusing on artistic elements.',
      maxTokens: 512,
    });
    console.log('Image Analysis:', imageAnalysis);

    // Test 4: Generate Image
    console.log('\n=== Test 4: Generate Image ===');
    const imageGenAgent = new Agent(openai, {
      description: 'You’re an artist specializing in surrealism.',
      defaultConfig: { model: 'dall-e-3', maxTokens: 1024 },
    });
    const imagePrompt = 'A surreal landscape with floating islands and glowing trees.';
    const generatedImage = await imageGenAgent.generateImage(imagePrompt, {
      size: '1024x1024',
      returnBase64: false,
      n: 1,
      maxTokens: 512,
    });
    console.log('Generated Image URL:', generatedImage);

    // Test 5: Generate Embeddings
    console.log('\n=== Test 5: Generate Embeddings ===');
    const textChunks = ['The quick brown fox jumps over the lazy dog.', 'Hello world!'];
    const embeddings = await openai.embedChunks(textChunks, {
      model: 'text-embedding-ada-002',
    });
    console.log('Embeddings Sample (first chunk, first 5 values):', embeddings[0].embedding.slice(0, 5));
    console.log('Embedding Dimensions:', embeddings[0].embedding.length);

    // Test 6: Generate Audio
    console.log('\n=== Test 6: Generate Audio ===');
    const audioAgent = new Agent(openai, {
      description: 'You’re an audio processing assistant.',
      defaultConfig: { model: 'tts-1' },
    });
    const textToSpeech = 'Hello, this is a test of text-to-speech.';
    const audioBuffer = await audioAgent.generateAudio(textToSpeech, {
      model: 'tts-1',
      voice: 'alloy',
      format: 'mp3',
    });
    const tempAudioPath = path.join(__dirname, `temp-audio-${Date.now()}.mp3`);
    fs.writeFileSync(tempAudioPath, audioBuffer);
    console.log('Generated Audio saved to:', tempAudioPath);

    // Test 7: Transcribe Audio
    console.log('\n=== Test 7: Transcribe Audio ===');
    try {
      const audioData = fs.readFileSync(tempAudioPath);
      const transcription = await audioAgent.transcribeAudio(audioData, {
        model: 'whisper-1',
        language: 'en',
      });
      console.log('Transcription:', transcription);
    } catch (error) {
      console.warn('Audio transcription failed:', error.message);
    } finally {
      // Clean up temporary audio file
      if (tempAudioPath && fs.existsSync(tempAudioPath)) {
        fs.unlinkSync(tempAudioPath);
      }
    }


  } catch (error) {
    console.error('Test Error:', {
      message: error.message,
      stack: error.stack,
    });
  } finally {
    // Close mock MCP server
    if (server) {
      server.close(() => console.log('Mock MCP server closed.'));
    }
  }
})();