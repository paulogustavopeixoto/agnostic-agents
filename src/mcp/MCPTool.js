// src/tools/adapters/MCPTool.js
const { Tool } = require('../tools/adapters/Tool');
const { MCPClient } = require('./MCPClient');

class MCPTool extends Tool {
  constructor({ name, description, parameters, endpoint, apiKey, mcpClient, remoteName = null, strict = true, outputSchema = null, metadata = {} }) {
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
      outputSchema,
      metadata: {
        sideEffectLevel: 'external_write',
        executionPolicy: 'require_approval',
        ...metadata,
        retryabilityHint: 'never',
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
