// examples/gemini-test.js
const { Agent, Tool, GeminiAdapter, MCPTool, N8nTool } = require('../index');
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
  let tempAudioPath;
  let tempVideoPath;
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

    const slackWorkflow = JSON.parse(fs.readFileSync(path.join(__dirname, 'workflows/slack_workflow.json')));
    const slackNotificationTool = new N8nTool({
      name: 'slack_notification',
      description: 'Send a notification to a Slack channel via n8n.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Message to send to Slack' },
        },
        required: ['message'],
      },
      workflow: slackWorkflow,
      credentials: {
        slackApi: {
          accessToken: process.env.SLACK_ACCESS_TOKEN // Replace with your Slack token
        }
      }
    });

    // Test 1: Generate Text with Function Calling, MCP, and n8n
    console.log('\n=== Test 1: Generate Text with Function Calling, MCP, and n8n ===');
    const agentWithTools = new Agent(gemini, {
      tools: [getWeatherTool, mcpSearchTool, slackNotificationTool],
      memory: new MockMemory(),
      description: 'You’re a versatile assistant handling weather, web searches, and Slack notifications.',
      defaultConfig: { model: 'gemini-1.5-pro', temperature: 0.7, maxTokens: 1024 },
    });
    const functionCallPrompt = 'Get the weather in Paris, France, search for recent AI news, and send a Slack notification with the summary.';
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
        model: 'text-embedding-004',
      });
      console.log('Embeddings Sample (first chunk, first 5 values):', embeddings[0].embedding.slice(0, 5));
      console.log('Embedding Dimensions:', embeddings[0].embedding.length);
    } catch (error) {
      console.warn('Embeddings failed:', error.message);
    }

    // Test 5: Transcribe Audio
    console.log('\n=== Test 5: Transcribe Audio ===');
    const audioAgent = new Agent(gemini, {
      description: 'You’re an audio transcription assistant.',
      defaultConfig: { model: 'gemini-1.5-pro' },
    });
    tempAudioPath = path.join(__dirname, 'sample.mp3'); // Replace with a real audio file
    try {
      const audioData = fs.readFileSync(tempAudioPath);
      const transcription = await audioAgent.transcribeAudio(audioData, {
        model: 'gemini-1.5-pro',
      });
      console.log('Transcription:', transcription);
    } catch (error) {
      console.warn('Audio transcription failed:', error.message);
    }

    // Test 6: Analyze Video
    console.log('\n=== Test 6: Analyze Video ===');
    const videoAgent = new Agent(gemini, {
      description: 'You’re a video analysis assistant.',
      defaultConfig: { model: 'gemini-1.5-pro' },
    });
    tempVideoPath = path.join(__dirname, 'sample.mp4'); // Replace with a real video file
    try {
      const videoData = fs.readFileSync(tempVideoPath);
      const videoAnalysis = await videoAgent.analyzeVideo(videoData, {
        prompt: 'Describe the content and key scenes in this video.',
        maxTokens: 512,
      });
      console.log('Video Analysis:', videoAnalysis);
    } catch (error) {
      console.warn('Video analysis failed:', error.message);
    }

    // Test 7: Generate Video
    console.log('\n=== Test 7: Generate Video ===');
    try {
      const videoBuffer = await videoAgent.generateVideo('A futuristic cityscape at sunset.', {
        model: 'veo-2.0-generate-001',
        format: 'mp4',
        duration: 10,
        aspectRatio: '16:9',
        personGeneration: 'dont_allow',
      });
      const outputPath = path.join(__dirname, 'generated-video.mp4');
      fs.writeFileSync(outputPath, videoBuffer);
      console.log('Generated Video saved to:', outputPath);
    } catch (error) {
      console.warn('Video generation failed:', error.message);
    }

  } catch (err) {
    console.error('Test Error:', {
      message: err.message || 'Unknown error',
      stack: err.stack,
    });
  } finally {
    // Clean up temporary files
    if (tempAudioPath && fs.existsSync(tempAudioPath)) {
      // fs.unlinkSync(tempAudioPath); // Uncomment to clean up
    }
    if (tempVideoPath && fs.existsSync(tempVideoPath)) {
      // fs.unlinkSync(tempVideoPath); // Uncomment to clean up
    }
    // Close mock MCP server
    if (server) {
      server.close(() => console.log('Mock MCP server closed.'));
    }
  }
})();