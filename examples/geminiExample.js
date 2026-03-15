const { Agent, Tool, GeminiAdapter } = require('../index');
require('dotenv').config();

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('Set GEMINI_API_KEY before running this example.');
    process.exit(1);
  }

  const adapter = new GeminiAdapter(process.env.GEMINI_API_KEY, {
    model: process.env.GEMINI_TEST_MODEL || 'gemini-2.0-flash',
  });

  const calculatorTool = new Tool({
    name: 'calculate',
    description: 'Evaluate a basic arithmetic expression.',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Expression like 12 * 7' },
      },
      required: ['expression'],
    },
    implementation: async ({ expression }) => {
      return { result: Function(`"use strict"; return (${expression})`)() };
    },
  });

  const agent = new Agent(adapter, {
    tools: [calculatorTool],
    description: 'You are a concise assistant. Use tools when they help.',
    defaultConfig: { temperature: 0.2, maxTokens: 300 },
  });

  const response = await agent.sendMessage('What is 12 * 7?');
  console.log(response);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
