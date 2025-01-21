// src/utils/jsonRepair.js

function removeJsonCodeFence(input) {
    if (typeof input !== 'string') {
      console.warn('Warning: removeJsonCodeFence was called with non-string input. Coercing to string.');
      input = String(input);
    }
    return input.replace(/```json|```/g, '');
  }
  
  /**
   * Attempt to parse the LLM output as JSON. If parse fails, 
   * use `agent` to generate a "repair" pass (only second pass).
   *
   * @param {object} agent - your Agent instance (or any adapter with .sendMessage)
   * @param {string} rawOutput - the output from the initial LLM call
   * @returns {Promise<any>} - the final parsed JSON
   */
  async function repairJsonOutput(agent, rawOutput) {
    // 1) Try parse as is
    let cleaned = removeJsonCodeFence(rawOutput);
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn("[repairJsonOutput] parse fail on initial output:", e.message);
    }
  
    // 2) Second pass repair
    const repairPrompt = `
        Your previous response was supposed to be valid JSON, but it contained syntax errors.
        Please fix it to valid JSON. Keep the same data, just fix any JSON structure issues.
        
        Previous text:
        ${cleaned}
        
        Return ONLY valid JSON, no extra commentary.
    `.trim();
  
    // The agent's .sendMessage() method returns a string
    const repairResponse = await agent.generateText(repairPrompt);
    const repairedCleaned = removeJsonCodeFence(repairResponse);
  
    try {
      return JSON.parse(repairedCleaned);
    } catch (err2) {
      console.error("[repairJsonOutput] parse fail after repair attempt:", err2.message);
      throw new Error("Failed to parse JSON after repair pass.");
    }
  }
  
  module.exports = {
    repairJsonOutput
  };