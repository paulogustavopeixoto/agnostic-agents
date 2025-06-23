const { Tool } = require('../agent/Tool');
const { MCPClient } = require('../utils');

class MCPTool extends Tool {
  /**
   * @param {object} options
   * @param {string} options.name - Tool name
   * @param {string} options.description - Tool description
   * @param {object} options.parameters - JSON schema for input (MCP uses inputSchema)
   * @param {string} [options.endpoint] - MCP server endpoint
   * @param {string} [options.apiKey] - MCP server API key
   * @param {MCPClient} [options.mcpClient] - Optional MCPClient instance
   * @param {boolean} [options.strict=true] - Enforce strict validation
   */
  constructor({ name, description, parameters, endpoint, apiKey, mcpClient, strict = true }) {
    super({
      name,
      description,
      parameters,
      implementation: async (args) => this._executeMCP(args),
      strict
    });
    this.mcpClient = mcpClient || (endpoint && apiKey ? new MCPClient({ endpoint, apiKey }) : null);
    if (!this.mcpClient) {
      throw new Error('MCPTool requires either mcpClient or both endpoint and apiKey');
    }
  }

  /**
   * Execute the MCP tool via the MCP server
   * @param {object} args - Input arguments from LLM
   * @returns {Promise<any>} - Tool execution result
   */
  async _executeMCP(args) {
    return await this.mcpClient.execute(this.name, args);
  }

  /**
   * Override toAnthropicTool to ensure MCP compatibility
   * @returns {object} - Anthropic-compatible MCP tool schema
   */
  toAnthropicTool() {
    return {
      name: this.name,
      description: this.description,
      input_schema: this.parameters // MCP expects input_schema
    };
  }
}

module.exports = { MCPTool };