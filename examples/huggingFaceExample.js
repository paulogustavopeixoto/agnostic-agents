// examples/huggingfaceexample.js
const { Agent, Tool, HFAdapter, MCPTool } = require('../index');
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
    if (!process.env.HUGGINGFACE_API_KEY) {
      console.error('Please set HUGGINGFACE_API_KEY in your .env file.');
      process.exit(1);
    }
    const hf = new HFAdapter(process.env.HUGGINGFACE_API_KEY);

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

    // Test 1: Generate Text
    console.log('\n=== Test 1: Generate Text ===');
    const textAgent = new Agent(hf, {
      description: 'You’re a text generation assistant.',
      defaultConfig: { model: 'facebook/bart-large-cnn' },
    });
    const textPrompt = 'Summarize the benefits of AI in healthcare.';
    const textResponse = await textAgent.sendMessage(textPrompt);
    console.log('Text Response:', textResponse);

    // Test 2: Analyze Image
    console.log('\n=== Test 2: Analyze Image ===');
    const imageAgent = new Agent(hf, {
      description: 'You’re an image analysis assistant.',
      defaultConfig: { model: 'Salesforce/blip-image-captioning-base' },
    });
    const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Portrait_of_Sir_Isaac_Newton%2C_1689_%28brightened%29.jpg/1920px-Portrait_of_Sir_Isaac_Newton%2C_1689_%28brightened%29.jpg';
    const imageAnalysis = await imageAgent.analyzeImage(imageUrl, {
      prompt: 'Describe this image.',
    });
    console.log('Image Analysis:', imageAnalysis);

    // Test 3: Generate Embeddings
    console.log('\n=== Test 3: Generate Embeddings ===');
    const textChunks = ['The quick brown fox jumps over the lazy dog.', 'Hello world!'];
    const embeddings = await hf.embedChunks(textChunks, {
      model: 'sentence-transformers/all-MiniLM-L6-v2',
    });
    console.log('Embeddings Sample (first chunk, first 5 values):', embeddings[0].embedding.slice(0, 5));
    console.log('Embedding Dimensions:', embeddings[0].embedding.length);

    // Test 4: Analyze Video
    console.log('\n=== Test 4: Analyze Video ===');
    const videoAgent = new Agent(hf, {
      description: 'You’re a video analysis assistant.',
      defaultConfig: { model: 'microsoft/git-large-videocaption' }, // Hypothetical model
    });
    const videoPath = path.join(__dirname, 'sample.mp4'); // Replace with a real video file
    try {
      const videoData = fs.readFileSync(videoPath);
      const videoAnalysis = await videoAgent.analyzeVideo(videoData, {
        prompt: 'Describe the content and key scenes in this video.',
        maxTokens: 512,
      });
      console.log('Video Analysis:', videoAnalysis);
    } catch (error) {
      console.warn('Video analysis failed:', error.message);
    }

    // Test 5: Generate Video
    console.log('\n=== Test 5: Generate Video ===');
    try {
      const videoBuffer = await videoAgent.generateVideo('A futuristic cityscape at sunset.', {
        model: 'hypothetical-video-model',
        format: 'mp4',
        duration: 10,
      });
      console.log('Generated Video:', videoBuffer);
    } catch (error) {
      console.warn('Video generation failed (expected):', error.message);
    }

  } catch (err) {
    console.error('Test Error:', {
      message: err.message || 'Unknown error',
      stack: err.stack,
    });
  } finally {
    // Close mock MCP server
    if (server) {
      server.close(() => console.log('Mock MCP server closed.'));
    }
  }
})();