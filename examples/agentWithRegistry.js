require('dotenv').config();
const { slack } = require('@activepieces/piece-slack');
const { PieceLoader } = require('../src/tools/PieceLoader');
const { ToolRegistry } = require('../src/tools/ToolRegistry');
const { Agent } = require('../src/agent/Agent');
const { OpenAIAdapter } = require('../src/llm/openAi'); // Assuming you have this

// 🔥 Initialize the registry
const registry = new ToolRegistry();

// 🔥 Load Slack tools dynamically
const slackTools = PieceLoader.load({
  pieceName: 'slack',
  piece: slack,
  authToken: process.env.SLACK_ACCESS_TOKEN,
});

// 🔥 Register the tools
registry.register(slackTools);

console.log('Registered Tools:', registry.list().map(t => t.name));

// 🔥 Initialize Agent with Registry
const agent = new Agent(new OpenAIAdapter(
  process.env.OPENAI_API_KEY
), {
  description: "You are an AI agent that can use Slack to send messages.",
  tools: registry,
  defaultConfig: { model: 'gpt-4o' },
});

// 🔥 Run interaction
(async () => {
  const userMessage = "Send a message to #general saying 'Hello team from AI agent!'";
  const result = await agent.sendMessage(userMessage);

  console.log('Agent Response:', result);
})();