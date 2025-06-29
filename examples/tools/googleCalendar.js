require('dotenv').config();
const { googleCalendar } = require('@activepieces/piece-google-calendar');
const { PieceLoader } = require('../src/tools/PieceLoader');
const { ToolRegistry } = require('../src/tools/ToolRegistry');
const { Agent } = require('../src/agent/Agent');
const { OpenAIAdapter } = require('../src/llm/openAi');

const registry = new ToolRegistry();

const calendarTools = PieceLoader.load({
  pieceName: 'googleCalendar',
  piece: googleCalendar,
  authToken: process.env.GOOGLE_CALENDAR_ACCESS_TOKEN,
});

registry.register(calendarTools);

console.log('Registered Tools:', registry.list().map(t => t.name));

const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY), {
  description: "You are an AI assistant that can create and manage Google Calendar events.",
  tools: registry,
  defaultConfig: { model: 'gpt-4o' },
});

(async () => {
  const userMessage = "Create an event titled 'Team Sync' for tomorrow at 3 PM.";
  const result = await agent.sendMessage(userMessage);

  console.log('Agent Response:', result);
})();