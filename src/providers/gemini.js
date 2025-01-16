// src/providers/GeminiAdapter.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * A hypothetical Gemini adapter supporting function calling
 * and a second pass to feed tool results back to the model.
 */
class GeminiAdapter {
  /**
   * @param {string} apiKey - Your Gemini/Google Generative AI API key
   * @param {object} options - e.g. { model: "gemini-1.5-flash" }
   */
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = options.model || "gemini-1.5-flash";
  }

  /**
   * 1) Generate text from Gemini with possible function calling.
   *    - "tools" is an array of your Tools, each with toGeminiFunctionDeclaration().
   *    - If the LLM calls a function, we parse it and return { toolCall: ... }.
   */
  async generateText(prompt, { tools = [], temperature = 0.7 } = {}) {
    // Convert your "Tool" instances to Gemini's functionDeclarations
    const functionDeclarations = tools.map((tool) => tool.toGeminiFunctionDeclaration());

    // Create a model that supports function-calling
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      tools: { functionDeclarations },
      toolConfig: {
        functionCallingConfig: { mode: "ANY" },
      },
      temperature,
    });

    // Start a chat with an empty history (or a real conversation if you prefer)
    const chat = model.startChat({ history: [] });

    // Send the prompt
    const result = await chat.sendMessage(prompt);
    const response = await result.response;

    // If Gemini decides to call a function
    if (response?.functionCalls && response.functionCalls.length > 0) {
      // For simplicity, take the first function call
      const fnCall = response.functionCalls[0];
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(fnCall.arguments || "{}");
      } catch (err) {
        console.error("Error parsing function call arguments:", err);
      }

      return {
        message: "",
        toolCall: {
          name: fnCall.name,
          arguments: parsedArgs
        }
      };
    }

    // Otherwise, it's a normal text response
    // Some Gemini clients let you do response.text()
    return { message: response?.text?.() || "" };
  }

  /**
   * 2) If the LLM actually called a function and the "agent" has run that function,
   *    we feed the tool result back to the model so it can incorporate it
   *    into the final answer.
   *
   *    This is the "second pass," just like OpenAI's generateToolResult approach.
   */
  async generateToolResult(originalPrompt, toolCall, toolResult, config) {
    const { temperature = 0.7 } = config || {};

    // Build a new model with the same function declarations if you want
    // (though you might not need them for the second pass)
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      temperature
      // If you want to keep function calls possible, also pass functionDeclarations & toolConfig again
    });

    // Build a chat "history" that includes:
    //  1) the user's original prompt
    //  2) the assistant's function call
    //  3) a "tool" or "function" message with the results of that call
    const chat = model.startChat({
      history: [
        { role: "user", content: originalPrompt },
        {
          role: "assistant",
          content: "",
          functionCall: {
            name: toolCall.name,
            arguments: JSON.stringify(toolCall.arguments)
          }
        },
        {
          // We define a "function" or "tool" role message with the tool's returned data
          role: "function",
          name: toolCall.name,
          content: JSON.stringify(toolResult)
        }
      ]
    });

    // Now we send a final empty message or bridging prompt.
    const result = await chat.sendMessage("");
    const response = await result.response;
    return response?.text?.() || "";
  }

  /**
   * If Gemini eventually supports text-to-image, you could do it here.
   */
  async generateImage(prompt, config) {
    throw new Error("Gemini Adapter: generateImage not implemented.");
  }

  /**
   * If Gemini eventually supports image-to-text or image analysis, you can do it here.
   */
  async analyzeImage(imageData, config) {
    throw new Error("Gemini Adapter: analyzeImage not implemented.");
  }
}

module.exports = { GeminiAdapter };