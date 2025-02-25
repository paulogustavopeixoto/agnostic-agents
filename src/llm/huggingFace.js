// src/providers/huggingFace.js
const { HfInference } = require('@huggingface/inference');

class HFAdapter {
  /**
   * @param {string} apiKey - Hugging Face API key
   * @param {object} options - Model selection options
   */
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.inference = new HfInference(apiKey);
    this.textModel = options.textModel || "mistralai/Mixtral-8x7B-Instruct-v0.1"; // Updated to a current model
    this.visionModel = options.visionModel || "Salesforce/blip-image-captioning-base"; // Better default for image-to-text
    this.imageGenModel = options.imageGenModel || "black-forest-labs/Flux.1-dev";
  }

  /**
   * Generate text (no native function calling support).
   */
  async generateText(promptObject, { temperature = 0.7, maxNewTokens = 12000, tools = [] } = {}) {
    const fullPrompt = `${promptObject.system ? `${promptObject.system}\n` : ""}${promptObject.context}${promptObject.user || ""}`.trim();

    // Hugging Face doesn’t natively support function calling via tools
    // Tools are ignored; use prompt-based instructions instead
    if (tools.length > 0) {
      console.warn("HFAdapter: Tools are not natively supported. Use prompt instructions for function-like behavior.");
    }

    const result = await this.inference.textGeneration({
      model: this.textModel,
      inputs: fullPrompt,
      parameters: {
        max_new_tokens: maxNewTokens,
        temperature,
      },
    });
    return { message: result.generated_text };
  }

  /**
   * Second pass for tool results via prompt injection.
   */
  async generateToolResult(promptObject, toolCall, toolResult, config = {}) {
    const fullPrompt = `${promptObject.system ? `${promptObject.system}\n` : ""}${promptObject.context}${promptObject.user || ""}`.trim();
    const toolPrompt = `${fullPrompt}\n\nTool ${toolCall.name} returned: ${JSON.stringify(toolResult)}\nPlease continue.`;
    const result = await this.inference.textGeneration({
      model: this.textModel,
      inputs: toolPrompt,
      parameters: {
        max_new_tokens: config.maxNewTokens || 12000,
        temperature: config.temperature || 0.7,
      },
    });
    return result.generated_text;
  }

  /**
   * Generate an image using a text-to-image model (e.g., Stable Diffusion).
   */
  async generateImage(promptObject, config = {}) {
    const fullPrompt = `${promptObject.system ? `${promptObject.system}\n` : ""}${promptObject.context}${promptObject.user || ""}`.trim();
    const result = await this.inference.textToImage({
      model: this.imageGenModel,
      inputs: fullPrompt,
    });
    // Result is typically a Buffer or base64 string
    return result; // Caller can handle as Buffer or base64
  }

  /**
   * Analyze an image using an image-to-text model (e.g., BLIP).
   */
  async analyzeImage(imageData, config = {}) {
    const promptObject = config.prompt || { user: "Describe this image." };
    const fullPrompt = `${promptObject.system ? `${promptObject.system}\n` : ""}${promptObject.context}${promptObject.user || "Describe this image."}`.trim();
    const result = await this.inference.imageToText({
      model: this.visionModel,
      data: imageData,
      parameters: { prompt: fullPrompt }, // Pass prompt if supported by model
    });
    // Result is typically an array like [{ generated_text: "..." }]
    return result[0]?.generated_text || "No description generated.";
  }
}

module.exports = { HFAdapter };
