require('dotenv').config();
const { jira } = require('@activepieces/piece-jira');
const { PieceLoader } = require('../src/tools/PieceLoader');
const { ToolRegistry } = require('../src/tools/ToolRegistry');
const { Agent } = require('../src/agent/Agent');
const { OpenAIAdapter } = require('../src/llm/openAi');

const registry = new ToolRegistry();

const jiraTools = PieceLoader.load({
  pieceName: 'jira',
  piece: jira,
  authToken: process.env.JIRA_ACCESS_TOKEN,
});

registry.register(jiraTools);

console.log('Registered Tools:', registry.list().map(t => t.name));

const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY), {
  description: "You are an AI assistant that manages Jira issues and projects.",
  tools: registry,
  defaultConfig: { model: 'gpt-4o' },
});

(async () => {
  const userMessage = "Create a Jira issue titled 'Update onboarding flow' in the 'PRODUCT' project.";
  const result = await agent.sendMessage(userMessage);

  console.log('Agent Response:', result);
})();