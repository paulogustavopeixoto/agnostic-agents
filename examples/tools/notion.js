require('dotenv').config();
const { notion } = require('@activepieces/piece-notion');
const { PieceLoader } = require('../src/tools/PieceLoader');
const { ToolRegistry } = require('../src/tools/ToolRegistry');
const { Agent } = require('../src/agent/Agent');
const { OpenAIAdapter } = require('../src/llm/openAi');

const registry = new ToolRegistry();

const notionTools = PieceLoader.load({
  pieceName: 'notion',
  piece: notion,
  authToken: process.env.NOTION_ACCESS_TOKEN,
});

registry.register(notionTools);

console.log('Registered Tools:', registry.list().map(t => t.name));

const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY), {
  description: "You are an AI assistant that can create pages and manage Notion databases.",
  tools: registry,
  defaultConfig: { model: 'gpt-4o' },
});

(async () => {
  const userMessage = "Create a Notion page titled 'Ideas' with content 'Build a better AI agent'.";
  const result = await agent.sendMessage(userMessage);

  console.log('Agent Response:', result);
})();