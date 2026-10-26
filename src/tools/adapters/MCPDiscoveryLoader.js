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
  static async load({ endpoint, apiKey, serviceName = 'mcp', transport = null, mcpClient = null, metadataForTool = null } = {}) {
    if (metadataForTool !== null && typeof metadataForTool !== 'function') throw new TypeError('Invalid MCP risk override.');
    if (!endpoint && !transport && !mcpClient) throw new Error('[MCPDiscoveryLoader] endpoint, transport, or mcpClient is required');

    // 1. Create a client for this MCP server
    const client = mcpClient || new MCPClient({ endpoint, apiKey, transport });

    // 2. Ask the server which tools it exposes
    const toolDefs = await client.listTools();

    // 3. Wrap each tool definition as an MCPTool
    const localNames = new Set();
    const tools = toolDefs.map(def => {
      const name = def.name || def.id;
      if (!name) {
        return null;
      }
      const localName = `${serviceName}_${name}`.replace(/[^\w-]/g, '_');
      if (localNames.has(localName)) throw new Error('MCP local tool names collide.');
      localNames.add(localName);

      const parameters =
        def.inputSchema ||
        def.input_schema ||
        def.parameters ||
        {
          type: 'object',
          properties: {},
        };

      return new MCPTool({
        name: localName,
        remoteName: name,
        description: def.description || `MCP tool "${name}"`,
        parameters,
        outputSchema: def.outputSchema || null,
        mcpClient: client,
        metadata: metadataForTool ? metadataForTool(def) : {},
      });
    }).filter(Boolean);

    return { tools, triggers: {} };
  }
}

module.exports = { MCPDiscoveryLoader };
