// src/tools/adapters/MCPDiscoveryLoader.js
const { MCPClient } = require('../../mcp/MCPClient');
const { MCPTool } = require('../../mcp/MCPTool');

/**
 * MCPDiscoveryLoader
 *
 * Given an MCP-style endpoint, discovers all tools exposed by the MCP server
 * and wraps them as MCPTool instances compatible with the Agent/ToolRegistry.
 */
class MCPDiscoveryLoader {
  /**
   * @param {object} options
   * @param {string} options.endpoint - Base URL of the MCP server (e.g., "https://mcp.example.com")
   * @param {string} [options.apiKey] - Optional API key for auth
   * @param {string} [options.serviceName="mcp"] - Logical name/prefix for tools
   *
   * @returns {Promise<{ tools: MCPTool[], triggers: object }>}
   */
  static async load({ endpoint, apiKey, serviceName = 'mcp' } = {}) {
    if (!endpoint) throw new Error('[MCPDiscoveryLoader] "endpoint" is required');

    // 1. Create a client for this MCP server
    const client = new MCPClient({ endpoint, apiKey });

    // 2. Ask the server which tools it exposes
    const toolDefs = await client.listTools();

    // 3. Wrap each tool definition as an MCPTool
    const tools = toolDefs.map(def => {
      const name = def.name || def.id;
      if (!name) {
        console.warn('[MCPDiscoveryLoader] Skipping tool without a name:', def);
        return null;
      }

      const parameters =
        def.input_schema ||
        def.parameters ||
        {
          type: 'object',
          properties: {},
        };

      return new MCPTool({
        name: `${serviceName}_${name}`, // avoid collisions if multiple MCP servers
        description: def.description || `MCP tool "${name}"`,
        parameters,
        mcpClient: client,
      });
    }).filter(Boolean);

    return { tools, triggers: {} };
  }
}

module.exports = { MCPDiscoveryLoader };