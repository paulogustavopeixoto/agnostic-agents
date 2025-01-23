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
  // 1) Remove any code fences
  const cleaned = removeJsonCodeFence(rawOutput);

  // 2) First attempt: parse as-is
  try {
    const parsed = JSON.parse(cleaned);
    // If successful, return immediately
    return parsed;
  } catch (parseErr) {
    console.warn("[repairJsonOutput] parse fail on initial output:", parseErr.message);
  }

  // 3) If the first parse failed, ask the LLM to fix the JSON
  const repairPrompt = `
  Your previous response was supposed to be valid JSON, but it contained syntax errors.
  Please fix it to valid JSON. Keep the same data, just fix any JSON structure issues.
  
  Previous text:
  ${cleaned}
  
  Return ONLY valid JSON, no extra commentary.
  `.trim();

  // The agent's .generateText() (or .sendMessage()) returns a string
  const repairResponse = await agent.generateText(repairPrompt);
  const repairedCleaned = removeJsonCodeFence(repairResponse);

  // 4) Second attempt: parse the repaired JSON
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