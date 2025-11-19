require('dotenv').config();

const { OpenAIAdapter } = require('../src/llm/OpenAi');
const { ToolRegistry } = require('../src/tools/adapters/ToolRegistry');
const { Planner } = require('../src/planner/Planner');
const { PlanExecutor } = require('../src/planner/PlanExecutor');
const { Memory } = require('../src/agent/Memory');
const { LocalVectorStore } = require('../src/db/LocalVectorStore');
const { createConsoleAskUser } = require('../src/utils/ConsoleAskUser');

// 👇 Modular integration loaders
const { loadCalcomTools } = require('../src/tools/integrations/calcom');
const { loadNotionTools } = require('../src/tools/integrations/notion');
const { loadSlackTools } = require('../src/tools/integrations/slack');

// 🔧 Setup
const openai = new OpenAIAdapter(process.env.OPENAI_API_KEY);
const askUser = createConsoleAskUser();
const registry = new ToolRegistry();

// ✅ Register Cal.com tools
const { tools: calcomTools } = loadCalcomTools({
  authToken: process.env.CALCOM_ACCESS_TOKEN
});
registry.register({ tools: calcomTools });

// ✅ Register Notion tools
const { tools: notionTools } = loadNotionTools({
  authToken: process.env.NOTION_ACCESS_TOKEN
});
registry.register({ tools: notionTools });

// ✅ Register Slack tools
const { tools: slackTools } = loadSlackTools({
  authToken: process.env.SLACK_ACCESS_TOKEN
});
registry.register({ tools: slackTools });

// 🧭 Log registered tools
console.log('🔧 Registered Tools:', registry.listTools().map(t => t.name));

// ✅ Initialize Memory
const memory = new Memory({
  vectorStore: new LocalVectorStore(),
  adapter: openai
});

const planner = new Planner({
  adapter: openai,
  tools: registry.listTools(),
});

const executor = new PlanExecutor({
  adapter: openai,
  toolRegistry: registry,
  askUser,
  memory
});

// 🏃 Run
(async () => {
  await memory.storeSemanticMemory("My name is Sarah.");
  await memory.storeSemanticMemory("The Slack channel for notifications is C093E89DD4J.");
  await memory.storeSemanticMemory("Maria Eugenia's Slack user ID is D08S37KHULX.");
  await memory.storeSemanticMemory("The parent page ID in Notion is 21f44e55019180f4878be94472909ed5.");
  await memory.storeSemanticMemory("The default event type ID for booking meetings is 977760.");
  await memory.storeSemanticMemory("The timezone is Europe/Lisbon.");

  const userPrompt = `Cancel all the bookings for tomorrow, notify the team on Slack on the general channel, and log the action in Notion.`;

  const plan = await planner.createPlan(userPrompt);
  console.log('📝 Generated Plan:', plan);

  const result = await executor.executePlan(plan, userPrompt);
  console.log('🎯 Final Output:', result);

  askUser.close();
})();