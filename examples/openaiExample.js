// examples/openaiFunctionCallExample.js
const { Agent, Tool, Memory, OpenAIAdapter } = require('../index');
require("dotenv").config();

(async () => {
  // 1) Instantiate the adapter
  const openai = new OpenAIAdapter(process.env.OPENAI_API_KEY);
  if (!process.env.OPENAI_API_KEY) {
    console.error("Please set OPENAI_API_KEY in your environment variables.");
    process.exit(1);
  }

  // 2) Define a weather tool for function calling
  const getWeatherTool = new Tool({
    name: "get_weather",
    description: "Get current temperature for a given location.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City, e.g. Bogotá, Colombia",
        },
      },
      required: ["location"],
    },
    implementation: async ({ location }) => {
      // Mock weather API response
      return { location, temperature: "18°C" };
    },
  });

  // Test 1: Generate Text with Function Calling
  console.log("\n=== Test 1: Generate Text with Function Calling ===");
  const agentWithTools = new Agent(openai, {
    tools: [getWeatherTool],
    memory: new Memory(),
    description: "You’re a weather assistant.",
  });
  const functionCallPrompt = "What's the weather like in Paris, France today?";
  const functionCallResponse = await agentWithTools.sendMessage(functionCallPrompt);
  console.log("Function Call Response:", functionCallResponse);

  // Test 2: Generate Text without Function Calling
  console.log("\n=== Test 2: Generate Text without Function Calling ===");
  const agentSimple = new Agent(openai, {
    description: "You’re a friendly chatbot.",
  });
  const simplePrompt = "Hello, how are you today?";
  const simpleResponse = await agentSimple.sendMessage(simplePrompt);
  console.log("Simple Text Response:", simpleResponse);

  // Test 3: Analyze Image
  console.log("\n=== Test 3: Analyze Image ===");
  const imageAgent = new Agent(openai, {
    description: "You’re an art critic.",
  });
  const imageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Portrait_of_Sir_Isaac_Newton%2C_1689_%28brightened%29.jpg/1920px-Portrait_of_Sir_Isaac_Newton%2C_1689_%28brightened%29.jpg";
  const imageAnalysis = await imageAgent.analyzeImage(imageUrl, {
    prompt: "Describe this image in detail.",
  });
  console.log("Image Analysis:", imageAnalysis);

  // Test 4: Generate Image
  console.log("\n=== Test 4: Generate Image ===");
  const imageGenAgent = new Agent(openai, {
    description: "You’re an artist specializing in surrealism.",
  });
  const imagePrompt = "A surreal landscape with floating islands and glowing trees.";
  const generatedImage = await imageGenAgent.generateImage(imagePrompt, {
    size: "1024x1024",
    returnBase64: false, // Set to true to get base64 instead of URL
  });
  console.log("Generated Image URL:", generatedImage);

  // Test 5: Generate Embeddings
  console.log("\n=== Test 5: Generate Embeddings ===");
  const textChunks = ["The quick brown fox jumps over the lazy dog.", "Hello world!"];
  const embeddings = await openai.embedChunks(textChunks);
  console.log("Embeddings Sample (first chunk, first 5 values):", embeddings[0].embedding.slice(0, 5));
  console.log("Embedding Dimensions:", embeddings[0].embedding.length);

})().catch((error) => {
  console.error("Test Error:", error.message);
});