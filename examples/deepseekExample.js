const { Agent, Tool, Memory, DeepSeekAdapter } = require('../index');
require("dotenv").config();

(async () => {
  const deepSeek = new DeepSeekAdapter(process.env.DEEPSEEK_API_KEY);
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("Please set DEEPSEEK_API_KEY in your environment variables.");
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
  const agentWithTools = new Agent(deepSeek, {
    tools: [getWeatherTool],
    memory: new Memory(),
    description: "You’re a weather assistant.",
  });
  const functionCallResponse = await agentWithTools.sendMessage("What's the weather like in Paris, France today?");
  console.log("Function Call Response:", functionCallResponse);

  // Test 2: Generate Text without Function Calling
  console.log("\n=== Test 2: Generate Text without Function Calling ===");
  const agentSimple = new Agent(deepSeek, {
    description: "You’re a friendly chatbot.",
  });
  const simpleResponse = await agentSimple.sendMessage("Hello, how are you today?");
  console.log("Simple Text Response:", simpleResponse);

  // Test 5: Generate Embeddings
  console.log("\n=== Test 5: Generate Embeddings ===");
  const textChunks = ["The quick brown fox jumps over the lazy dog.", "Hello world!"];
  const embeddings = await deepSeek.embedChunks(textChunks);
  console.log("Embeddings Sample (first chunk, first 5 values):", embeddings[0].embedding.slice(0, 5));
  console.log("Embedding Dimensions:", embeddings[0].embedding.length);
})().catch((error) => {
  console.error("Test Error:", error.message);
});