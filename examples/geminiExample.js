// examples/geminiExample.js
const { Agent, Tool, GeminiAdapter, MCPTool } = require('../index');
require('dotenv').config();

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
    if (!process.env.GEMINI_API_KEY) {
      console.error('Please set GEMINI_API_KEY in your .env file.');
      process.exit(1);
    }
    const gemini = new GeminiAdapter(process.env.GEMINI_API_KEY);

    // 2) Define tools
    // Weather tool for function calling
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
        // Mock weather API response
        return { location, temperature: '18°C' };
      },
    });

    // MCP tool for remote execution
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
    const agentWithTools = new Agent(gemini, {
      tools: [getWeatherTool, mcpSearchTool],
      memory: new MockMemory(),
      description: 'You’re a versatile assistant handling weather and web searches.',
      defaultConfig: { model: 'gemini-1.5-pro', temperature: 0.7, maxTokens: 1024 },
    });
    const functionCallPrompt = 'Get the weather in Paris, France, and search for recent AI news.';
    const functionCallResponse = await agentWithTools.sendMessage(functionCallPrompt);
    console.log('Function Call Response:', functionCallResponse);

    // Test 2: Generate Text without Function Calling
    console.log('\n=== Test 2: Generate Text without Function Calling ===');
    const agentSimple = new Agent(gemini, {
      description: 'You’re a friendly chatbot.',
      defaultConfig: { model: 'gemini-1.5-pro', temperature: 0.8, maxTokens: 512 },
    });
    const simplePrompt = 'Hello, how are you today?';
    const simpleResponse = await agentSimple.sendMessage(simplePrompt);
    console.log('Simple Text Response:', simpleResponse);

    // Test 3: Analyze Image
    console.log('\n=== Test 3: Analyze Image ===');
    const imageAgent = new Agent(gemini, {
      description: 'You’re an art critic.',
      defaultConfig: { model: 'gemini-1.5-pro', maxTokens: 1024 },
    });
    const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Portrait_of_Sir_Isaac_Newton%2C_1689_%28brightened%29.jpg/1920px-Portrait_of_Sir_Isaac_Newton%2C_1689_%28brightened%29.jpg';
    const imageAnalysis = await imageAgent.analyzeImage(imageUrl, {
      prompt: 'Describe this image in detail, focusing on artistic elements.',
      maxTokens: 512,
    });
    console.log('Image Analysis:', imageAnalysis);

    // Test 4: Generate Embeddings
    console.log('\n=== Test 4: Generate Embeddings ===');
    const textChunks = ['The quick brown fox jumps over the lazy dog.', 'Hello world!'];
    try {
      const embeddings = await gemini.embedChunks(textChunks, {
        model: 'text-embedding-004', // Adjust based on Gemini API
      });
      console.log('Embeddings Sample (first chunk, first 5 values):', embeddings[0].embedding.slice(0, 5));
      console.log('Embedding Dimensions:', embeddings[0].embedding.length);
    } catch (error) {
      console.warn('Embeddings not supported by GeminiAdapter:', error.message);
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