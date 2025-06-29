require('dotenv').config();

const { calendly } = require('@activepieces/piece-calendly');
const { PieceLoader } = require('../../src/tools/PieceLoader');
const { ToolRegistry } = require('../../src/tools/ToolRegistry');
const { Agent } = require('../../src/agent/Agent');
const { OpenAIAdapter } = require('../../src/llm/openAi');
const { CalendlySpec } = require('../../src/tools/specs/CalendlySpec');

// 🔥 Initialize Tool Registry
const registry = new ToolRegistry();

// 🔥 Load Calendly with Custom API call fallback
const { tools: calendlyTools, triggers: calendlyTriggers } = PieceLoader.load({
  pieceName: 'calendly',
  piece: calendly,
  authToken: process.env.CALENDLY_API_KEY,
  spec: new CalendlySpec(),
});

registry.register({ tools: [...calendlyTools], triggers: { ...calendlyTriggers } });

console.log('Registered Tools:', registry.listTools().map(t => t.name));
console.log('calendly:', calendly);

// 🔥 Initialize Agent
const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY), {
  description: 'You are an AI agent that can manage Calendly events using API.',
  tools: registry,
  defaultConfig: { model: 'gpt-4o' },
});

// 🔥 Run Example
(async () => {
  const userMessage = `
    Use Calendly to fetch my scheduled events.
  `;

  const result = await agent.sendMessage(userMessage);

  console.log('Agent Response:', result);
})();