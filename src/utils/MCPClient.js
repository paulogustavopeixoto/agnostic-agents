const { RetryManager } = require('./RetryManager');

class MCPClient {
  constructor({ endpoint, apiKey, retryManager = new RetryManager({ retries: 3, baseDelay: 1000, maxDelay: 10000 }) }) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.retryManager = retryManager;
  }

  async execute(toolName, input) {
    const axios = (await import('axios')).default;
    return await this.retryManager.execute(async () => {
      const response = await axios.post(
        `${this.endpoint}/execute`,
        { tool: toolName, input },
        { headers: { Authorization: `Bearer ${this.apiKey}` } }
      );
      return response.data.result;
    });
  }
}

module.exports = { MCPClient };