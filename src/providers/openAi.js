// src/providers/OpenAIAdapter.js
const { OpenAI } = require("openai");
const fs = require("fs");

class OpenAIAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Generate text via chat-completion with optional function calling (tools).
   */
  async generateText(prompt, { model = "gpt-4o-mini", temperature = 0.7, tools = [] } = {}) {
    const openAIFunctions = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    const completion = await this.openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      functions: openAIFunctions.length > 0 ? openAIFunctions : undefined,
      function_call: openAIFunctions.length > 0 ? "auto" : undefined,
    });

    const choice = completion.choices[0].message;
    if (choice.function_call) {
      return {
        message: "",
        toolCall: {
          name: choice.function_call.name,
          arguments: JSON.parse(choice.function_call.arguments || "{}"),
        },
      };
    }

    return { message: choice.content || "" };
  }

  /**
   * If the LLM requested a tool call, we handle a "second pass" to feed the tool result back.
   */
  async generateToolResult(originalPrompt, toolCall, toolResult, config) {
    const completion = await this.openai.chat.completions.create({
      model: config.model || "gpt-4o-mini",
      messages: [
        { role: "user", content: originalPrompt },
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
   * (Text -> Image) generation using e.g. DALL·E 3
   */
  async generateImage(prompt, { model = "dall-e-3", size = "1024x1024", returnBase64 = false } = {}) {
    const response = await this.openai.images.generate({
      model,
      prompt,
      n: 1,
      size,
    });

    // Typically returns { data: [{ url: ... }] }
    const imageUrl = response.data[0].url;
    if (!returnBase64) {
      return imageUrl;
    }

    // Optionally fetch and return as base64
    const axios = (await import("axios")).default;
    const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const base64 = Buffer.from(imageResponse.data, "binary").toString("base64");
    return `data:image/png;base64,${base64}`;
  }

  /**
   * Analyze an image by sending it to "gpt-4o" or "gpt-4o-mini" (Vision-enabled).
   *
   * @param {string|Buffer} imageData - If string: could be a URL or base64. If Buffer, convert to base64.
   * @param {object} config - e.g. { model: "gpt-4o-mini", prompt: "What's in this image?" }
   */
  async analyzeImage(imageData, config = {}) {
    const model = config.model || "gpt-4o-mini";
    const userPrompt = config.prompt || "What's in this image?";

    // Convert input to data URL if needed
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
        // Assume it's a local file path
        if (fs.existsSync(imageData)) {
          const fileBuffer = fs.readFileSync(imageData);
          dataUrl = `data:image/jpeg;base64,${fileBuffer.toString("base64")}`;
        } else {
          throw new Error(`Image path "${imageData}" not found or invalid.`);
        }
      }
    } else {
      throw new Error("Unsupported imageData format. Must be string (URL/path) or Buffer.");
    }

    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: {
              url: dataUrl,
              detail: "high", // this can be "high" or "low"
            },
          },
        ],
      },
    ];

    const response = await this.openai.chat.completions.create({
      model,
      messages,
    });
    return response.choices[0].message.content;
  }

  /**
   * Generate embeddings for an array of text chunks using OpenAI.
   * Returns an array of embedding objects, each containing an "embedding" array of floats.
   *
   * @param {string[]} chunks - array of text strings to embed.
   * @param {object} [options]
   * @param {string} [options.model="text-embedding-3-small"] - the embedding model to use
   * @returns {Promise<Array>} - array of objects { object, index, embedding }
   */
  async embedChunks(chunks) {
    // The new OpenAI library supports multiple inputs in a single call
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks,
      encoding_format: "float",
    });

    // response.data is an object with shape:
    // { object: 'list', data: [ { object: 'embedding', index: 0, embedding: [ floats ] }, ... ] }
    return response.data; // array of { index, embedding, ... }
  }
}

module.exports = { OpenAIAdapter };