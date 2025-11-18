require('dotenv').config();
const fs = require('fs');
const path = require('path');

const { Agent } = require('../src/agent/Agent');
const { OpenAIAdapter } = require('../src/llm/openAi');
const { PieceLoader } = require('../src/tools/adapters/ApiLoader');
const { createConsoleAskUser } = require('../src/utils/ConsoleAskUser');
const { Memory } = require('../src/agent/Memory');
const { LocalVectorStore } = require('../src/db/LocalVectorStore');
const { ToolRegistry } = require('../src/tools/adapters/ToolRegistry');

// 🔗 Load pieces
const { calcom } = require('@activepieces/piece-cal-com');
const { slack } = require('@activepieces/piece-slack');
const { notion } = require('@activepieces/piece-notion');

// 🔗 Load API specs
const calcomApiSpec = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/tools/specs/calcom.ApiSpec.json'), 'utf-8')
);
const { NotionSpec } = require('../src/tools/specs/NotionSpec');
const { SlackSpec } = require('../src/tools/specs/SlackSpec');
const { CalcomSpec } = require('../src/tools/integrations/calcom/CalcomSpec');

// 🔑 Auth tokens from .env
const auth = {
  slack: process.env.SLACK_ACCESS_TOKEN,
  notion: process.env.NOTION_ACCESS_TOKEN,
  calcom: process.env.CALCOM_ACCESS_TOKEN,
  openai: process.env.OPENAI_API_KEY,
};

// ✅ OpenAI Adapter
const openai = new OpenAIAdapter(auth.openai);

// ✅ Memory (conversation, semantic, entity)
const memory = new Memory({
  vectorStore: new LocalVectorStore(),
  adapter: openai,
});

// ✅ Tool Registry
const registry = new ToolRegistry();

// 🔧 Register Slack Tools
registry.register(
  PieceLoader.load({
    pieceName: 'slack',
    piece: slack,
    authToken: auth.slack,
    spec: new SlackSpec(),
  })
);

// 🔧 Register Notion Tools
registry.register(
  PieceLoader.load({
    pieceName: 'notion',
    piece: notion,
    authToken: auth.notion,
    spec: new NotionSpec(),
  })
);

// 🔧 Register Cal.com Tools (via API Spec)
registry.register(
  PieceLoader.load({
    pieceName: 'calcom',
    piece: calcom,
    authToken: auth.calcom,
    apiSpec: calcomApiSpec,
    spec: new CalcomSpec(),
  })
);

console.log('Registered Tools:', registry.listTools().map(t => t.name));
const slackMarkdownTool = registry.listTools().find(
  tool => tool.name === 'slackMarkdownToSlackFormat'
);

console.log(
  '🪵 Registered Tool (slackMarkdownToSlackFormat):',
  JSON.stringify(slackMarkdownTool, null, 2)
);
// 🧠 Agent
const agent = new Agent(openai, {
  description: 'An agent that manages bookings, sends Slack messages, and logs actions in Notion.',
  tools: registry,
  memory,
  askUser: createConsoleAskUser(),
  defaultConfig: { model: 'gpt-4o' },
});

// ✅ Log memory updates
agent.memory.on('memoryUpdate', (key, value) => {
  console.log(`[Memory] Stored: ${key} =`, value);
});

// 🚀 Run a prompt
(async () => {
  const result = await agent.sendMessage(
    `Create a booking of 15 min for tomorrow. The event id is 977760. My timezone is in lisbon. Today is the 2nd of july 2025. And let Maria Eugenia know in Slack that I booked those meetings. Also create a page in Notion logging what you did.`
  );

  console.log('\n🎯 Final Result:', JSON.stringify(result, null, 2));
})();