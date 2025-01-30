// src/providers/HFAdapter.js
const { HfInference } = require('@huggingface/inference'); 

class HFAdapter {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.inference = new HfInference(apiKey);
    this.textModel = options.textModel || "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B";
    this.visionModel = options.visionModel || "microsoft/vision-transformer-base";
    this.imageGenModel = options.imageGenModel || "runwayml/stable-diffusion-v1-5";
  }

  async generateText(prompt, { temperature = 0.7, maxNewTokens = 12000, tools = [] } = {}) {
    // Hugging Face does not have official "function calling" 
    // so you'd do prompt-based function calling if you want that
    // or skip it in HF for now.
    
    // This is a simplistic text generation approach:
    const result = await this.inference.textGeneration({
      model: this.textModel,
      inputs: prompt,
      parameters: {
        max_new_tokens: maxNewTokens,
        temperature,
      }
    });
    return { message: result.generated_text };
  }

  async generateToolResult(originalPrompt, toolCall, toolResult, config) {
    // For HF, there's no built-in function calling => you'll do manual prompt injection:
    const prompt = `${originalPrompt}\n\nTool ${toolCall.name} returned: ${JSON.stringify(toolResult)}\nPlease continue.`;
    return (await this.generateText(prompt, config)).message;
  }

  async generateImage(prompt, options = {negative_prompt: null, height: 256, width: 256, num_inference_steps: 3, guidance_scale: 0.5}) {
    // For example, stable diffusion:
    const result = await this.inference.textToImage({
      model: this.imageGenModel,
      inputs: prompt,
      parameters: {
        negative_prompt: options.negative_prompt,
        height: options.height,
        width: options.width,
        num_inference_steps: options.num_inference_steps,
        guidance_scale: options.guidance_scale
      }
      // possibly pass other parameters
    });
    // result is a base64 or a buffer, depending on your library
    return result;
  }

  async analyzeImage(imageData, options = {}) {
    // For example, image-to-text model (BLIP, etc.)
    const result = await this.inference.imageToText({
      model: this.visionModel,
      data: imageData,
    });
    // Might return e.g. [{ generated_text: "A cat on a couch" }]
    return result;
  }
}

module.exports = { HFAdapter };
