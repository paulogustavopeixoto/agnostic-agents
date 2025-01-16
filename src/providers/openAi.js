// src/providers/OpenAIAdapter.js
const { OpenAI } = require("openai");
const fs = require("fs");

class OpenAIAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.openai = new OpenAI({ apiKey });
  }

  async generateText(prompt, { model = "gpt-4o-mini", temperature = 0.7, tools = [] } = {}) {
    // (unchanged) ...
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

  async generateToolResult(originalPrompt, toolCall, toolResult, config) {
    // (unchanged) ...
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
   * Text-to-image via DALL·E or another model
   */
  async generateImage(prompt, { model = "dall-e-3", size = "1024x1024", returnBase64 = false } = {}) {
    // OpenAI image generation
    const response = await this.openai.images.generate({
      model,
      prompt,
      n: 1,
      size,
    });

    // Typically returns { data: [{ url: ... }] }
    const imageUrl = response.data[0].url;

    if (!returnBase64) {
      return imageUrl; // just return the URL
    }

    // If you want base64, fetch the image and encode it
    const axios = (await import("axios")).default;
    const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const base64 = Buffer.from(imageResponse.data, "binary").toString("base64");
    return `data:image/png;base64,${base64}`;
  }

  /**
   * Analyze an image by sending it to "gpt-4o" or "gpt-4o-mini" (Vision-enabled).
   *
   * @param {string|Buffer} imageData  - If string: could be a URL or base64. If Buffer, we convert to base64.
   * @param {object} config            - e.g. { model: "gpt-4o-mini", prompt: "What's in this image?" }
   */
  async analyzeImage(imageData, config = {}) {
    const model = config.model || "gpt-4o-mini";
    const userPrompt = config.prompt || "What's in this image?";

    // 1) Convert the input to a data URL or pass it as a normal URL if it's a string
    let dataUrl = "";
    if (Buffer.isBuffer(imageData)) {
      // It's raw image data. Convert to base64.
      const base64 = imageData.toString("base64");
      dataUrl = `data:image/jpeg;base64,${base64}`;
    } else if (typeof imageData === "string") {
      // Check if it's already a valid "data:image/..." or "http" URL
      // For example, you can do a simple check:
      const lower = imageData.toLowerCase();
      if (lower.startsWith("data:image/")) {
        dataUrl = imageData; // already a data URL
      } else if (lower.startsWith("http")) {
        dataUrl = imageData; // a direct URL
      } else {
        // Otherwise assume it's a file path -> read and convert
        if (fs.existsSync(imageData)) {
          const fileBuffer = fs.readFileSync(imageData);
          dataUrl = `data:image/jpeg;base64,${fileBuffer.toString("base64")}`;
        } else {
          // If it's none of the above, treat it as a path that might not exist
          throw new Error(`Image path "${imageData}" not found or invalid.`);
        }
      }
    } else {
      throw new Error("Unsupported imageData format. Must be string (URL or path) or Buffer.");
    }

    // 2) Build the messages array with "image_url" content
    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: {
              url: dataUrl,
              detail: "low",
            },
          },
        ],
      },
    ];

    // 3) Send the request to the chat completion endpoint
    const response = await this.openai.chat.completions.create({
      model,
      messages,
    });

    // 4) Return the text from the response
    return response.choices[0].message.content;
  }
}

module.exports = { OpenAIAdapter };