require('dotenv').config();
const { asana } = require('@activepieces/piece-asana');
const { PieceLoader } = require('../src/tools/PieceLoader');
const { ToolRegistry } = require('../src/tools/ToolRegistry');
const { Agent } = require('../src/agent/Agent');
const { OpenAIAdapter } = require('../src/llm/openAi');

const registry = new ToolRegistry();

const asanaTools = PieceLoader.load({
  pieceName: 'asana',
  piece: asana,
  authToken: process.env.ASANA_ACCESS_TOKEN,
});

registry.register(asanaTools);

console.log('Registered Tools:', registry.list().map(t => t.name));

const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY), {
  description: "You are an AI assistant that manages Asana tasks.",
  tools: registry,
  defaultConfig: { model: 'gpt-4o' },
});

(async () => {
  const userMessage = "Create an Asana task titled 'Plan product launch'.";
  const result = await agent.sendMessage(userMessage);

  console.log('Agent Response:', result);
})();