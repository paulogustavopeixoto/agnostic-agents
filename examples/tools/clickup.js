require('dotenv').config();
const { clickup } = require('@activepieces/piece-clickup');
const { PieceLoader } = require('../src/tools/PieceLoader');
const { ToolRegistry } = require('../src/tools/ToolRegistry');
const { Agent } = require('../src/agent/Agent');
const { OpenAIAdapter } = require('../src/llm/openAi');

const registry = new ToolRegistry();

const clickupTools = PieceLoader.load({
  pieceName: 'clickup',
  piece: clickup,
  authToken: process.env.CLICKUP_ACCESS_TOKEN,
});

registry.register(clickupTools);

console.log('Registered Tools:', registry.list().map(t => t.name));

const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY), {
  description: "You are an AI assistant that can manage ClickUp tasks and lists.",
  tools: registry,
  defaultConfig: { model: 'gpt-4o' },
});

(async () => {
  const userMessage = "Create a ClickUp task titled 'Finish documentation'.";
  const result = await agent.sendMessage(userMessage);

  console.log('Agent Response:', result);
})();