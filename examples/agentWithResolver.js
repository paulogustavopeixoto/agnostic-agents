require('dotenv').config();

const { notion } = require('@activepieces/piece-notion');
const { slack } = require('@activepieces/piece-slack');

const { ToolRegistry } = require('../src/tools/ToolRegistry');
const { PieceLoader } = require('../src/tools/PieceLoader');
const { Agent } = require('../src/agent/Agent');
const { OpenAIAdapter } = require('../src/llm/openAi');
const { createConsoleAskUser } = require('../src/utils/ConsoleAskUser');

const { NotionSpec } = require('../src/tools/specs/NotionSpec');
const { SlackSpec } = require('../src/tools/specs/SlackSpec');

// ✅ Initialize Tool Registry
const registry = new ToolRegistry();

// ✅ Register Slack Tools with SlackSpec
registry.register(PieceLoader.load({
  pieceName: 'slack',
  piece: slack,
  authToken: process.env.SLACK_ACCESS_TOKEN,
  spec: new SlackSpec(),
}));

// ✅ Register Notion Tools with NotionSpec
registry.register(PieceLoader.load({
  pieceName: 'notion',
  piece: notion,
  authToken: process.env.NOTION_ACCESS_TOKEN,
  spec: new NotionSpec(),
}));

// ✅ Debugging: Print available Notion actions
console.log('🔍 slack Actions:', Object.keys(slack._actions || slack.actions));

const notionCreatePage = notion._actions?.createPage || notion.actions?.createPage;

console.log(
  '🧠 Notion Create Page Props:',
  JSON.stringify(notionCreatePage?.props, null, 2)
);

// ✅ Initialize OpenAI Adapter
const openai = new OpenAIAdapter(process.env.OPENAI_API_KEY);

// ✅ Initialize Agent with Missing Info Resolver
const agent = new Agent(openai, {
  tools: registry.list(),
  description: 'You are an AI assistant. You MUST use tools/functions when available. Do not answer in plain text if a tool is applicable. To create a Notion page or send a Slack message, call the appropriate function.',
  askUser: createConsoleAskUser(),
});

// ✅ Run Test
(async () => {
  try {
    const response = await agent.sendMessage(
      `Post ‘Hello everyone’ in a channel called #not_a_real_channel`
    );

    console.log('🧠 Agent Response:', response);
  } catch (err) {
    console.error('❌ Agent Error:', err);
  }
})();