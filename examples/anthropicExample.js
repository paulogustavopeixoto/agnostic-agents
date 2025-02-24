const { Agent, Tool, Memory, AnthropicAdapter } = require('../index');
require("dotenv").config();

(async () => {
  const anthropic = new AnthropicAdapter(process.env.ANTHROPIC_API_KEY);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Please set ANTHROPIC_API_KEY in your environment variables.");
    process.exit(1);
  }

  const getWeatherTool = new Tool({
    name: "get_weather",
    description: "Get current temperature for a given location.",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "City, e.g. Bogotá, Colombia" },
      },
      required: ["location"],
    },
    implementation: async ({ location }) => ({ location, temperature: "18°C" }),
  });

  // Test 1: Generate Text with Function Calling
  console.log("\n=== Test 1: Generate Text with Function Calling ===");
  const agentWithTools = new Agent(anthropic, {
    tools: [getWeatherTool],
    memory: new Memory(),
    description: "You’re a weather assistant.",
  });
  const functionCallResponse = await agentWithTools.sendMessage("What's the weather like in Paris, France today?");
  console.log("Function Call Response:", functionCallResponse);

  // Test 2: Generate Text without Function Calling
  console.log("\n=== Test 2: Generate Text without Function Calling ===");
  const agentSimple = new Agent(anthropic, {
    description: "You’re a friendly chatbot.",
  });
  const simpleResponse = await agentSimple.sendMessage("Hello, how are you today?");
  console.log("Simple Text Response:", simpleResponse);
})().catch((error) => {
  console.error("Test Error:", error.message);
});