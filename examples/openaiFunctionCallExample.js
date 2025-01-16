// examples/openaiFunctionCallExample.js
const { Agent, Tool, Memory, OpenAIAdapter } = require('../index');

(async () => {
  // 1) Create a "tool" that returns the weather
  const getWeatherTool = new Tool({
    name: "get_weather",
    description: "Get current temperature for a given location.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City, e.g. Bogotá, Colombia"
        }
      },
      required: ["location"],
    },
    implementation: async ({ location }) => {
      // In real usage, call an actual weather API. 
      // We'll mock it:
      return { location, temperature: "18°C" };
    },
  });

  // 2) Instantiate the adapter
  const openai = new OpenAIAdapter(process.env.OPENAI_API_KEY);
  
  // 3) Create agent with memory + the tool
  const agent = new Agent(openai, { tools: [getWeatherTool], memory: new Memory() });

  // 4) Send a user message that triggers function calling
  const userPrompt = "What's the weather like in Paris, France today?";
  const response = await agent.sendMessage(userPrompt);

  // 5) Print the final result
  console.log("Final Agent Response:", response);
})();