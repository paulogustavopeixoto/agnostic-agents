require('dotenv').config();
const { github } = require('@activepieces/piece-github');
const { PieceLoader } = require('../src/tools/PieceLoader');
const { ToolRegistry } = require('../src/tools/ToolRegistry');
const { Agent } = require('../src/agent/Agent');
const { OpenAIAdapter } = require('../src/llm/openAi');

const registry = new ToolRegistry();

const githubTools = PieceLoader.load({
  pieceName: 'github',
  piece: github,
  authToken: process.env.GITHUB_ACCESS_TOKEN,
});

registry.register(githubTools);

console.log('Registered Tools:', registry.list().map(t => t.name));

const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY), {
  description: "You are an AI assistant that manages GitHub issues and pull requests.",
  tools: registry,
  defaultConfig: { model: 'gpt-4o' },
});

(async () => {
  const userMessage = "Open an issue titled 'Fix login bug' in the repository 'example-repo'.";
  const result = await agent.sendMessage(userMessage);

  console.log('Agent Response:', result);
})();