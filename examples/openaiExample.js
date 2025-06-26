// examples/openai-test.js
const { Agent, Tool, OpenAIAdapter, MCPTool, N8nTool } = require('../index');
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

    let slackWorkflow;
    try {
      slackWorkflow = JSON.parse(fs.readFileSync(path.join(__dirname, 'workflows/slack_workflow.json')));
    } catch (error) {
      console.warn('Failed to load slack_workflow.json:', error.message);
    }

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
          accessToken: process.env.SLACK_ACCESS_TOKEN,
        },
      },
    });

    // Test 1: Generate Text with Function Calling, MCP, and n8n
    console.log('\n=== Test 1: Generate Text with Function Calling, MCP, and n8n ===');
    const agentWithTools = new Agent(openai, {
      tools: [getWeatherTool, mcpSearchTool, slackNotificationTool],
      memory: new MockMemory(),
      description: 'You’re a versatile assistant handling weather, web searches, and Slack notifications.',
      defaultConfig: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 1024 },
    });
    const functionCallPrompt = 'Get the weather in Paris, France, search for recent AI news, and send a Slack notification with the summary.';
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
    tempAudioPath = path.join(__dirname, `temp-audio-${Date.now()}.mp3`);
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
    }

    // Test 8: Analyze Video
    console.log('\n=== Test 8: Analyze Video ===');
    const videoAgent = new Agent(openai, {
      description: 'You’re a video analysis assistant.',
      defaultConfig: { model: 'gpt-4o-mini' },
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
      console.warn('Video analysis failed (expected for OpenAI):', error.message);
    }

    // Test 9: Generate Video
    console.log('\n=== Test 9: Generate Video ===');
    try {
      const videoBuffer = await videoAgent.generateVideo('A futuristic cityscape at sunset.', {
        model: 'dall-e-3', // Hypothetical model
        format: 'mp4',
        duration: 10,
      });
      const outputPath = path.join(__dirname, 'generated-video.mp4');
      fs.writeFileSync(outputPath, videoBuffer);
      console.log('Generated Video saved to:', outputPath);
    } catch (error) {
      console.warn('Video generation failed (expected for OpenAI):', error.message);
    }

  } catch (error) {
    console.error('Test Error:', {
      message: error.message,
      stack: error.stack,
    });
  } finally {
    // Clean up temporary files
    if (tempAudioPath && fs.existsSync(tempAudioPath)) {
      fs.unlinkSync(tempAudioPath);
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