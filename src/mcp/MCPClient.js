// src/mcp/MCPClient.js
const { RetryManager } = require('../utils/RetryManager');

class MCPClient {
  constructor({ endpoint, apiKey, retryManager = new RetryManager({ retries: 3, baseDelay: 1000, maxDelay: 10000 }) }) {
    this.endpoint = endpoint.replace(/\/+$/, ''); // strip trailing slash
    this.apiKey = apiKey;
    this.retryManager = retryManager;
  }

  /**
   * Low-level helper for auth headers.
   */
  _buildHeaders(extra = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...extra,
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  /**
   * Execute a tool on the MCP server.
   * POST /execute { tool, input }
   */
  async execute(toolName, input) {
    const axios = (await import('axios')).default;

    return await this.retryManager.execute(async () => {
      const response = await axios.post(
        `${this.endpoint}/execute`,
        { tool: toolName, input },
        { headers: this._buildHeaders() }
      );

      // Expecting { result: ... } or raw data
      const data = response.data;
      if (data && Object.prototype.hasOwnProperty.call(data, 'result')) {
        return data.result;
      }
      return data;
    });
  }

  /**
   * Discover all tools exposed by the MCP server.
   * GET /tools
   *
   * Expected responses (we try to be flexible):
   * - [{ name, description, input_schema }, ...]
   * - { tools: [...] }
   * - { [name]: { name, description, input_schema } }
   */
  async listTools() {
    const axios = (await import('axios')).default;

    return await this.retryManager.execute(async () => {
      const response = await axios.get(
        `${this.endpoint}/tools`,
        { headers: this._buildHeaders() }
      );

      const data = response.data;

      if (Array.isArray(data)) {
        return data;
      }

      if (Array.isArray(data.tools)) {
        return data.tools;
      }

      // If it's an object keyed by tool name
      if (data && typeof data === 'object') {
        return Object.values(data);
      }

      throw new Error('[MCPClient] Unexpected /tools response format');
    });
  }

  /**
   * Get a single tool definition by name.
   * Optional convenience helper.
   */
  async getTool(name) {
    const tools = await this.listTools();
    return tools.find(t => t.name === name) || null;
  }
}

module.exports = { MCPClient };