// examples/geminiToolExample.js
const { Agent, Tool, Memory } = require('../index');
const { GeminiAdapter } = require('../index');

(async () => {
  // Example tool for demonstration
  const classifyRequestTool = new Tool({
    name: "classifyUserRequest",
    description: "Classifies user request for a presentation slide",
    parameters: {
      type: "object",
      properties: {
        requestType: { type: "string" },
        details: { type: "string" },
      },
      required: ["requestType"]
    },
    implementation: async (args) => {
      console.log("Executing classifyUserRequest with args:", args);
      // Return a mock classification
      return { status: "OK", requestType: args.requestType, details: args.details };
    }
  });

  const geminiAdapter = new GeminiAdapter(process.env.GEMINI_API_KEY, {
    model: "gemini-1.5-flash"
  });

  const agent = new Agent(geminiAdapter, {
    tools: [classifyRequestTool],
    memory: new Memory()
  });

  // Possibly triggers the classifyUserRequest function call
  const response = await agent.sendMessage("I want to update my presentation with new content on slide p3.");
  console.log("Gemini final response:", response);
})();
