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
const { Memory } = require('../src/agent/Memory');
const { LocalVectorStore } = require('../src/db/LocalVectorStore'); // If you have a simple local vector store

// ✅ Initialize Tool Registry
const registry = new ToolRegistry();

registry.register(PieceLoader.load({
  pieceName: 'slack',
  piece: slack,
  authToken: process.env.SLACK_ACCESS_TOKEN,
  spec: new SlackSpec(),
}));

registry.register(PieceLoader.load({
  pieceName: 'notion',
  piece: notion,
  authToken: process.env.NOTION_ACCESS_TOKEN,
  spec: new NotionSpec(),
}));

// ✅ Debugging info
console.log('🔍 slack Actions:', Object.keys(slack._actions || slack.actions));

const notionCreatePage = notion._actions?.createPage || notion.actions?.createPage;
console.log(
  '🧠 Notion Create Page Props:',
  JSON.stringify(notionCreatePage?.props, null, 2)
);

// ✅ Initialize OpenAI Adapter
const openai = new OpenAIAdapter(process.env.OPENAI_API_KEY);

// ✅ Initialize Memory (Conversation + Entity + Semantic)
const memory = new Memory({
  vectorStore: new LocalVectorStore(),
  adapter: openai
});

// ✅ Pre-store some entity knowledge (simulate prior knowledge)
memory.setEntity('assistant', 'Sarah'); // persistent fact
memory.setEntity('favorite_channel', 'C0123456789'); // a Slack channel ID (fake example)

// ✅ Initialize Agent
const agent = new Agent(openai, {
  tools: registry.list(),
  memory,
  description: `
    You are a helpful personal assistant. 
    Only use tools/functions if available and applicable. 
    You remember facts like who the assistant is, favorite channels, or workspace IDs.
    If a required value is not found in memory, ask the user.
  `,
  askUser: createConsoleAskUser(),
});

// ✅ Run Example Conversation
(async () => {
  try {
    console.log('-----------------------------------------');
    console.log('🧠 Conversation 1: Storing information');
    await agent.sendMessage(`My assistant's name is Emily. Remember this.`);

    console.log('-----------------------------------------');
    console.log('🧠 Conversation 2: Check memory retrieval');
    const response1 = await agent.sendMessage(`Who is my assistant?`);
    console.log('➡️ Response:', response1);

    console.log('-----------------------------------------');
    console.log('🧠 Conversation 3: Using tools with memory');
    const response2 = await agent.sendMessage(
      `Post "Daily standup starts now" in my favorite channel.`
    );
    console.log('➡️ Response:', response2);

    console.log('-----------------------------------------');
    console.log('🧠 Conversation 4: Store to Notion');
    const response3 = await agent.sendMessage(
      `Create a Notion page titled "Meeting Notes" with content "Discussed project deadlines".`
    );
    console.log('➡️ Response:', response3);

    console.log('-----------------------------------------');
    console.log('🧠 Conversation 5: Check semantic fallback');
    await memory.storeSemanticMemory('project_lead', 'Alex Johnson');
    const response4 = await agent.sendMessage(`Who is the project lead?`);
    console.log('➡️ Response:', response4);

    console.log('-----------------------------------------');
  } catch (err) {
    console.error('❌ Agent Error:', err);
  }
})();