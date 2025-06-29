require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { calcom } = require('@activepieces/piece-cal-com');

const { ToolRegistry } = require('../../src/tools/ToolRegistry');
const { PieceLoader } = require('../../src/tools/PieceLoader');
const { Agent } = require('../../src/agent/Agent');
const { OpenAIAdapter } = require('../../src/llm/openAi');
const { CalcomSpec } = require('../../src/tools/specs/CalcomSpec');
const { createConsoleAskUser } = require('../../src/utils/ConsoleAskUser');

// 🔥 Load Cal.com API spec
const calcomApiSpec = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../src/tools/specs/calcom.ApiSpec.json'), 'utf-8')
);
// 🔧 Initialize registry
const registry = new ToolRegistry();

const { tools, triggers } = PieceLoader.load({
  pieceName: 'calcom',
  piece: calcom, 
  authToken: process.env.CALCOM_ACCESS_TOKEN,
  apiSpec: calcomApiSpec,
  spec: new CalcomSpec()
});

registry.register({ tools, triggers });

console.log('🔧 Registered Tools:', registry.listTools().map(t => t.name));

// 🤖 Initialize Agent
const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY), {
  tools: registry,
  description: 'You are an AI assistant that works with Cal.com API and native tools.',
  askUser: createConsoleAskUser(),
});

// ▶️ Run it
(async () => {
  const response = await agent.sendMessage(
    `Block my calendar next tuesday full day.`
  );

  console.log('🧠 Agent Response:', response);
})();