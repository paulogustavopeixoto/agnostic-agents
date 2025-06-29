require('dotenv').config();
const { zoom } = require('@activepieces/piece-zoom');
const { PieceLoader } = require('../src/tools/PieceLoader');
const { ToolRegistry } = require('../src/tools/ToolRegistry');
const { Agent } = require('../src/agent/Agent');
const { OpenAIAdapter } = require('../src/llm/openAi');

const registry = new ToolRegistry();

const zoomTools = PieceLoader.load({
  pieceName: 'zoom',
  piece: zoom,
  authToken: process.env.ZOOM_ACCESS_TOKEN,
});

registry.register(zoomTools);

console.log('Registered Tools:', registry.list().map(t => t.name));

const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY), {
  description: "You are an AI assistant that can create and manage Zoom meetings.",
  tools: registry,
  defaultConfig: { model: 'gpt-4o' },
});

(async () => {
  const userMessage = "Schedule a Zoom meeting called 'Project Sync' for tomorrow at 10 AM.";
  const result = await agent.sendMessage(userMessage);

  console.log('Agent Response:', result);
})();