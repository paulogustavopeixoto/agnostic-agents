const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiAdapter {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = options.model || "gemini-1.5-flash";
  }

  async generateText(prompt, { tools = [], temperature = 0.7 } = {}) {
    const functionDeclarations = tools.map((tool) =>
      tool.toGeminiFunctionDeclaration()
    );

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      tools: { functionDeclarations },
      toolConfig: {
        functionCallingConfig: { mode: "ANY" },
      },
      temperature,
    });

    const chat = model.startChat({ history: [] });
    const result = await chat.sendMessage(prompt);

    // Raw Gemini response
    const response = await result.response;
    console.log("Gemini raw response:", JSON.stringify(response, null, 2));

    // 1) Check if there's a candidate with a function call
    const candidate = response?.candidates?.[0];
    if (!candidate) {
      // Nothing returned
      return { message: "" };
    }

    // 2) Look through 'parts' for a functionCall
    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.functionCall) {
        // The function call is already an object
        const fnCall = part.functionCall;
        const { name, args } = fnCall;

        // If the args are an object, no JSON.parse needed
        // If it was a string, you would parse. But from your logs, it's an object:
        // "args": { "text": "Hello World" }

        return {
          message: "",
          toolCall: {
            name,
            arguments: args,
          },
        };
      }
    }

    // 3) If no function call, just gather any text parts
    //    Typically, text is in 'part.text'
    const textParts = parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join("\n");

    return { message: textParts };
  }

  /**
   * Second pass to handle the tool result
   */
  async generateToolResult(originalPrompt, toolCall, toolResult, config) {
    const { temperature = 0.7 } = config || {};

    // Rebuild model if you want function calling again, else keep it simple
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      temperature,
    });

    const chat = model.startChat({
      history: [
        { role: "user", content: originalPrompt },
        {
          role: "assistant",
          content: "",
          functionCall: {
            name: toolCall.name,
            arguments: JSON.stringify(toolCall.arguments),
          },
        },
        {
          role: "function",
          name: toolCall.name,
          content: JSON.stringify(toolResult),
        },
      ],
    });

    // Provide a bridging prompt so the model returns some text
    const finalResult = await chat.sendMessage(
      "Please use the function result above to provide a final answer to the user."
    );
    const response = await finalResult.response;

    // Just like before, we parse text from 'candidates[0].content.parts'
    const candidate = response?.candidates?.[0];
    if (!candidate) {
      return "";
    }

    const parts = candidate.content?.parts || [];
    // If, on the second pass, it calls another function, handle that, etc. 
    // but typically you'll just want the text here:
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