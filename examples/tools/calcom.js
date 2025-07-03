require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { calcom } = require('@activepieces/piece-cal-com');

const { ToolRegistry } = require('../../src/tools/adapters/ToolRegistry');
const { PieceLoader } = require('../../src/tools/adapters/ApiLoader');
const { Agent } = require('../../src/agent/Agent');
const { OpenAIAdapter } = require('../../src/llm/openAi');
const { CalcomSpec } = require('../../src/tools/integrations/calcom/CalcomSpec');
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
const askUser = createConsoleAskUser();

console.log('🔧 Registered Tools:', registry.listTools().map(t => t.name));

// 🤖 Initialize Agent
const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY), {
  tools: registry,
  description: 'You are an AI assistant that works with Cal.com API and native tools.',
  askUser: askUser,
});

// ▶️ Run it
(async () => {
  try {
    const response = await agent.sendMessage(
      `create two bookings for the day after tomorrow in lisbon timezone and list all bookings that day.Today is the 1st of july 2025. My name is Paulo and the email is paulogustavopeixoto@gmail.com. The event id is 977760`
    );
    console.log('🧠 Agent Response:', response);
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    askUser.close(); // 🔥 Cleanly close readline
  }
})();