const { Client } = require('@anthropic-ai/sdk'); // hypothetical package

class ClaudeProvider {
  constructor(apiKey) {
    this.client = new Client(apiKey);
  }

  async generate(prompt, options = {}) {
    const response = await this.client.complete({
      prompt,
      ...options
    });
    return response.completion;
  }
}

module.exports = { ClaudeProvider };
