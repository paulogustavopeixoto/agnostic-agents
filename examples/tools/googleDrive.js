require('dotenv').config();
const { googleDrive } = require('@activepieces/piece-google-drive');
const { PieceLoader } = require('../src/tools/PieceLoader');
const { ToolRegistry } = require('../src/tools/ToolRegistry');
const { Agent } = require('../src/agent/Agent');
const { OpenAIAdapter } = require('../src/llm/openAi');

const registry = new ToolRegistry();

const driveTools = PieceLoader.load({
  pieceName: 'googleDrive',
  piece: googleDrive,
  authToken: process.env.GOOGLE_DRIVE_ACCESS_TOKEN,
});

registry.register(driveTools);

console.log('Registered Tools:', registry.list().map(t => t.name));

const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY), {
  description: "You are an AI assistant that can manage files on Google Drive.",
  tools: registry,
  defaultConfig: { model: 'gpt-4o' },
});

(async () => {
  const userMessage = "Upload a file called 'report.pdf' to my Google Drive.";
  const result = await agent.sendMessage(userMessage);

  console.log('Agent Response:', result);
})();