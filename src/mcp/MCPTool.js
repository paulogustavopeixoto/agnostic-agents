// src/tools/adapters/MCPTool.js
const { Tool } = require('../tools/adapters/Tool');
const { MCPClient } = require('./MCPClient');

class MCPTool extends Tool {
  constructor({ name, description, parameters, endpoint, apiKey, mcpClient, remoteName = null, strict = true }) {
    if (!mcpClient && !endpoint) {
      throw new Error('MCPTool requires mcpClient or endpoint.');
    }

    const client =
      mcpClient ||
      new MCPClient({
        endpoint,
        apiKey,
      });
    const targetName = remoteName || name;

    const implementation = async (args) => {
      return await client.execute(targetName, args);
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
    this.remoteName = targetName;
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
