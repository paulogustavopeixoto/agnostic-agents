require('dotenv').config();
const { gmail } = require('@activepieces/piece-gmail');
const { PieceLoader } = require('../../src/tools/PieceLoader');
const { ToolRegistry } = require('../../src/tools/ToolRegistry');
const { Agent } = require('../../src/agent/Agent');
const { OpenAIAdapter } = require('../../src/llm/openAi');

const registry = new ToolRegistry();

const gmailTools = PieceLoader.load({
  pieceName: 'gmail',
  piece: gmail,
  authToken: process.env.GMAIL_ACCESS_TOKEN,
});

registry.register(gmailTools);

console.log('Registered Tools:', registry.list().map(t => t.name));

const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY), {
  description: "You are an AI agent that can send emails via Gmail.",
  tools: registry,
  defaultConfig: { model: 'gpt-4o' },
});

(async () => {
  const userMessage = "Send an email to john@example.com with subject 'Meeting' and body 'Let's meet tomorrow.'";
  const result = await agent.sendMessage(userMessage);

  console.log('Agent Response:', result);
})();