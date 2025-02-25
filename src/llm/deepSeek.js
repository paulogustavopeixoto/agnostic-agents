// src/providers/deepSeek.js
const { OpenAI } = require("openai");

class DeepSeekAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.openai = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey });
  }

  /**
   * Generate text via chat-completion with optional function calling (tools).
   */
  async generateText(promptObject, { model = "deepseek-chat", temperature = 0.7, tools = [] } = {}) {
    const openAIFunctions = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    const messages = [];
    if (promptObject.system) messages.push({ role: "system", content: promptObject.system });
    if (promptObject.context) messages.push({ role: "user", content: promptObject.context });
    if (promptObject.user) messages.push({ role: "user", content: promptObject.user });

    const completion = await this.openai.chat.completions.create({
      model,
      messages,
      temperature,
      functions: openAIFunctions.length > 0 ? openAIFunctions : undefined,
      function_call: openAIFunctions.length > 0 ? "auto" : undefined,
    });

    const choice = completion.choices[0].message;
    if (choice.function_call) {
      try {
        const parsed = JSON.parse(choice.function_call.arguments || "{}");
        return {
          message: "",
          toolCall: {
            name: choice.function_call.name,
            arguments: parsed,
          },
        };
      } catch (err) {
        console.error("Failed to parse function_call arguments:", err);
        return {
          message: choice.content || "",
          toolCall: { name: choice.function_call.name, arguments: {} },
        };
      }
    }
    return { message: choice.content || "" };
  }

  /**
   * Handle a second pass for tool call results (if supported).
   */
  async generateToolResult(promptObject, toolCall, toolResult, config) {
    const fullPrompt = `${promptObject.system ? `${promptObject.system}\n` : ""}${promptObject.context}${promptObject.user || ""}`.trim();
    const completion = await this.openai.chat.completions.create({
      model: config.model || "deepseek-chat",
      messages: [
        { role: "user", content: fullPrompt },
        {
          role: "assistant",
          content: "",
          function_call: { name: toolCall.name, arguments: JSON.stringify(toolCall.arguments) },
        },
        {
          role: "function",
          name: toolCall.name,
          content: JSON.stringify(toolResult),
        },
      ],
      temperature: config.temperature || 0.7,
    });

    const choice = completion.choices[0].message;
    return choice.content;
  }

  /**
   * DeepSeek doesn’t support image generation.
   */
  async generateImage(promptObject, config = {}) {
    throw new Error("DeepSeek does not support image generation.");
  }

  /**
   * DeepSeek doesn’t support image analysis.
   */
  async analyzeImage(imageData, config = {}) {
    throw new Error("DeepSeek does not support image analysis.");
  }

  /**
   * Generate embeddings for text chunks.
   */
  async embedChunks(chunks, { model = "text-embedding-3-small" } = {}) {
    throw new Error("DeepSeek does not support image analysis.");
  }
}

module.exports = { DeepSeekAdapter };