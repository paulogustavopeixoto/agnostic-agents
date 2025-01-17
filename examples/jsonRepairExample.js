// examples/geminiJsonExample.js
const { Agent, Memory } = require('../index');
const { GeminiAdapter } = require('../index');
const { repairJsonOutput } = require('../src/utils/jsonRepair');

(async () => {
  const geminiAdapter = new GeminiAdapter(process.env.GEMINI_API_KEY, {
    model: "gemini-1.5-flash"
  });

  const agent = new Agent(geminiAdapter, {
    memory: new Memory()
  });

  // 1) The user’s original request
  const response = await agent.sendMessage("I want to update my presentation with new content on slide p3.");
  console.log("Gemini final response (raw):", response);

  // 2) Now check if it's valid JSON
  let parsedJson;
  try {
    parsedJson = JSON.parse(response);
    // If parse succeeded, done:
    console.log("Parsed JSON from first pass:", parsedJson);
  } catch (err) {
    console.warn("First pass JSON parse failed. Attempting repair...");
    // 3) If parse fails, we call the repair function
    try {
      parsedJson = await repairJsonOutput(agent, response);
      console.log("Parsed JSON after repair pass:", parsedJson);
    } catch (repairErr) {
      console.error("Still couldn't parse JSON after repair:", repairErr.message);
    }
  }
})();