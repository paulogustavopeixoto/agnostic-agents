const { Agent, Tool, OpenAIAdapter } = require('../index');
require('dotenv').config();

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Set OPENAI_API_KEY before running this example.');
    process.exit(1);
  }

  const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY, {
    model: 'gpt-4o-mini',
  });

  const weatherTool = new Tool({
    name: 'get_weather',
    description: 'Get a mock weather report for a city.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City and country.' },
      },
      required: ['location'],
    },
    implementation: async ({ location }) => ({
      location,
      forecast: 'Sunny',
      temperatureC: 21,
    }),
  });

  const agent = new Agent(adapter, {
    tools: [weatherTool],
    description: 'You are a concise assistant. Use tools when needed.',
    defaultConfig: { temperature: 0.2, maxTokens: 300 },
  });

  const response = await agent.sendMessage('What is the weather in Lisbon?');
  console.log(response);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
