// src/providers/gemini.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiAdapter {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = options.model || "gemini-1.5-flash";
  }

  async generateText(promptObject, { tools = [], temperature = 0.7 } = {}) {
    const fullPrompt = `${promptObject.system ? `${promptObject.system}\n` : ""}${promptObject.context}${promptObject.user || ""}`.trim();
    let modelConfig = {
      model: this.modelName,
      temperature,
    };

    if (tools.length > 0) {
      const functionDeclarations = tools.map((tool) => tool.toGeminiFunctionDeclaration());
      modelConfig = {
        ...modelConfig,
        tools: { functionDeclarations },
        toolConfig: {
          functionCallingConfig: { mode: "ANY" },
        },
      };
    }

    const model = this.genAI.getGenerativeModel(modelConfig);
    const chat = model.startChat({ history: [] });
    const result = await chat.sendMessage(fullPrompt);

    const response = await result.response;
    const candidate = response?.candidates?.[0];
    if (!candidate) {
      return { message: "" };
    }

    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.functionCall) {
        const fnCall = part.functionCall;
        const { name, args } = fnCall;
        return {
          message: "",
          toolCall: {
            name,
            arguments: args,
          },
        };
      }
    }

    const textParts = parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join("\n");

    return { message: textParts };
  }

  /**
   * Second pass to handle the tool result
   */
  async generateToolResult(promptObject, toolCall, toolResult, config) {
    const { temperature = 0.7 } = config || {};
    const fullPrompt = `${promptObject.system ? `${promptObject.system}\n` : ""}${promptObject.context}${promptObject.user || ""}`.trim();

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      temperature,
    });

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: fullPrompt }] }, // Gemini uses "parts" with "text"
        {
          role: "model", // Gemini uses "model" for assistant
          parts: [{
            functionCall: {
              name: toolCall.name,
              args: toolCall.arguments, // Already an object
            },
          }],
        },
        {
          role: "function",
          parts: [{
            functionResponse: {
              name: toolCall.name,
              response: { content: JSON.stringify(toolResult) }, // Structured response
            },
          }],
        },
      ],
    });

    const finalResult = await chat.sendMessage("Please use the function result above to provide a final answer to the user.");
    const response = await finalResult.response;

    const candidate = response?.candidates?.[0];
    if (!candidate) {
      return "";
    }

    const parts = candidate.content?.parts || [];
    const textParts = parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join("\n");

    return textParts;
  }

  async generateImage(prompt, config) {
    throw new Error("Gemini Adapter: generateImage not implemented.");
  }

  async analyzeImage(imageData, config) {
    throw new Error("Gemini Adapter: analyzeImage not implemented.");
  }
}

module.exports = { GeminiAdapter };