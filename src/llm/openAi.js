// src/providers/OpenAi.js
const { OpenAI } = require("openai");

class OpenAIAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.openai = new OpenAI({ apiKey });
  }

  async generateText(promptObject, { model = "gpt-4o-mini", temperature = 0.7, tools = [] } = {}) {
    const openAIFunctions = tools.map(tool => tool.toOpenAIFunction());

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

  async generateToolResult(promptObject, toolCall, toolResult, config) {
    const fullPrompt = `${promptObject.system ? `${promptObject.system}\n` : ""}${promptObject.context}${promptObject.user || ""}`.trim();
    const completion = await this.openai.chat.completions.create({
      model: config.model || "gpt-4o-mini",
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

  async generateImage(promptObject, { model = "dall-e-3", size = "1024x1024", returnBase64 = false, n = 1 } = {}) {
    const prompt = `${promptObject.system ? `${promptObject.system}\n` : ""}${promptObject.context}${promptObject.user || ""}`.trim();
    const response = await this.openai.images.generate({
      model,
      prompt,
      n,
      size,
    });

    if (!returnBase64) {
      return response.data.map(img => img.url);
    }

    const axios = (await import("axios")).default;
    const base64Array = [];
    for (const image of response.data) {
      const imageResponse = await axios.get(image.url, { responseType: "arraybuffer" });
      const base64 = Buffer.from(imageResponse.data, "binary").toString("base64");
      base64Array.push(`data:image/png;base64,${base64}`);
    }
    return base64Array;
  }

  async analyzeImage(imageData, config = {}) {
    const model = config.model || "gpt-4o-mini";
    const promptObject = config.prompt || { user: "What's in this image?" };
    let dataUrl = "";
    if (Buffer.isBuffer(imageData)) {
      const base64 = imageData.toString("base64");
      dataUrl = `data:image/jpeg;base64,${base64}`;
    } else if (typeof imageData === "string") {
      const lower = imageData.toLowerCase();
      if (lower.startsWith("data:image/")) {
        dataUrl = imageData;
      } else if (lower.startsWith("http")) {
        dataUrl = imageData;
      } else {
        throw new Error("Unsupported imageData format. Must be a URL or base64 string.");
      }
    } else {
      throw new Error("Unsupported imageData format. Must be a URL, base64 string, or Buffer.");
    }

    const messages = [];
    if (promptObject.system) messages.push({ role: "system", content: promptObject.system });
    if (promptObject.context) messages.push({ role: "user", content: promptObject.context });
    messages.push({
      role: "user",
      content: [
        { type: "text", text: promptObject.user || "What's in this image?" },
        { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
      ],
    });
    const response = await this.openai.chat.completions.create({ model, messages });
    return response.choices[0].message.content;
  }

  async embedChunks(chunks, { model = "text-embedding-ada-002" } = {}) {
    if (!Array.isArray(chunks) || !chunks.length || chunks.some(c => typeof c !== 'string' || !c.trim())) {
      throw new Error("embedChunks requires a non-empty array of non-empty strings.");
    }
    console.log("Embedding chunks:", chunks); // Debug
    const response = await this.openai.embeddings.create({
      model,
      input: chunks,
      encoding_format: "float",
    });
    return response.data;
  }
}

module.exports = { OpenAIAdapter };