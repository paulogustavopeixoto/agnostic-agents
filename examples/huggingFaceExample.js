const { Agent, Tool, Memory, HFAdapter } = require('../index');
require("dotenv").config();

(async () => {
  const hf = new HFAdapter(process.env.HUGGINGFACE_API_KEY);
  if (!process.env.HUGGINGFACE_API_KEY) {
    console.error("Please set HUGGINGFACE_API_KEY in your environment variables.");
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

  // Test 1: Generate Text with Tool (Prompt-Based)
  console.log("\n=== Test 1: Generate Text with Tool (Prompt-Based) ===");
  const agentWithTools = new Agent(hf, {
    tools: [getWeatherTool],
    memory: new Memory(),
    description: "You’re a weather assistant.",
  });
  const functionCallResponse = await agentWithTools.sendMessage("What's the weather like in Paris, France today?");
  console.log("Function Call Response:", functionCallResponse);

  // Test 2: Generate Text without Tool
  console.log("\n=== Test 2: Generate Text without Tool ===");
  const agentSimple = new Agent(hf, {
    description: "You’re a friendly chatbot.",
  });
  const simpleResponse = await agentSimple.sendMessage("Hello, how are you today?");
  console.log("Simple Text Response:", simpleResponse);

  // Test 3: Generate Image
  console.log("\n=== Test 3: Generate Image ===");
  const imageGenAgent = new Agent(hf, {
    description: "You’re an artist specializing in surrealism.",
  });
  const generatedImage = await imageGenAgent.generateImage("A surreal landscape with floating islands and glowing trees.", {
    height: 512,
    width: 512,
    num_inference_steps: 10,
  });
  console.log("Generated Image (Buffer length):", generatedImage.length); // Log buffer length

  // Test 4: Analyze Image
  console.log("\n=== Test 4: Analyze Image ===");
  const imageAgent = new Agent(hf, {
    description: "You’re an art critic.",
  });
  const imageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Portrait_of_Sir_Isaac_Newton%2C_1689_%28brightened%29.jpg/1920px-Portrait_of_Sir_Isaac_Newton%2C_1689_%28brightened%29.jpg";
  const imageAnalysis = await imageAgent.analyzeImage(imageUrl);
  console.log("Image Analysis:", imageAnalysis);
})().catch((error) => {
  console.error("Test Error:", error.message);
});