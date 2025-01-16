class Agent {
    constructor(providerAdapter, options = {}) {
      this.provider = providerAdapter;   // e.g. new OpenAIProvider(), new GeminiProvider()
      this.memory = options.memory || null;  // memory instance if desired
      this.tools = options.tools || [];      // array of available tools
    }
  
    /**
     * Main method to handle user queries.
     * @param {string} userMessage - The user's question or command.
     * @returns {Promise<string>} The response from the LLM (after any internal logic).
     */
    async handle(userMessage) {
      // 1. Build the prompt (may include memory, instructions, userMessage)
      const prompt = this._buildPrompt(userMessage);
  
      // 2. Call the provider
      const llmResponse = await this.provider.generate(prompt);
  
      // 3. Optionally parse the LLM response to decide next steps (use a tool? store memory?)
      //    For a simple agent that just returns the LLM text:
      if (this.memory) {
        this.memory.store(userMessage, llmResponse);
      }
  
      return llmResponse;
    }
  
    _buildPrompt(userMessage) {
      // Construct a prompt that includes system instructions, memory context, etc.
      let prompt = "";
      if (this.memory) {
        prompt += this.memory.getContext();
      }
      prompt += `User: ${userMessage}\nAgent:`;
      return prompt;
    }
  }
  
  module.exports = { Agent };