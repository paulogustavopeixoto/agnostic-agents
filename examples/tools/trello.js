require('dotenv').config();
const { trello } = require('@activepieces/piece-trello');
const { PieceLoader } = require('../src/tools/PieceLoader');
const { ToolRegistry } = require('../src/tools/ToolRegistry');
const { Agent } = require('../src/agent/Agent');
const { OpenAIAdapter } = require('../src/llm/openAi');

const registry = new ToolRegistry();

const trelloTools = PieceLoader.load({
  pieceName: 'trello',
  piece: trello,
  authToken: process.env.TRELLO_ACCESS_TOKEN,
});

registry.register(trelloTools);

console.log('Registered Tools:', registry.list().map(t => t.name));

const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY), {
  description: "You are an AI assistant that can manage Trello boards, lists, and cards.",
  tools: registry,
  defaultConfig: { model: 'gpt-4o' },
});

(async () => {
  const userMessage = "Create a Trello card titled 'Write blog post' in the 'Content' list.";
  const result = await agent.sendMessage(userMessage);

  console.log('Agent Response:', result);
})();