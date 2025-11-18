// src/tools/adapters/MCPTool.js
const { Tool } = require('../tools/adapters/Tool');

class MCPTool extends Tool {
  constructor({ name, description, parameters, endpoint, apiKey, mcpClient, strict = true }) {
    if (!mcpClient && (!endpoint || !apiKey)) {
      throw new Error("MCPTool requires mcpClient or (endpoint+apiKey)");
    }

    const client = mcpClient;

    const implementation = async (args) => {
      return await client.execute(name, args);
    };

    super({
      name,
      description,
      parameters,
      implementation,
      strict,
      outputSchema: { type: "object" },
      metadata: {
        tags: ["mcp"],
        version: "1.0.0"
      }
    });

    this.mcpClient = client;
  }

  toAnthropicTool() {
    return {
      name: this.name,
      description: this.description,
      input_schema: this.parameters
    };
  }
}

module.exports = { MCPTool };