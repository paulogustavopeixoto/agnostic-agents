const { MCPDiscoveryLoader } = require('../src/tools/adapters/MCPDiscoveryLoader');
const { ToolRegistry } = require('../src/tools/adapters/ToolRegistry');

(async () => {
  const registry = new ToolRegistry();

  const { tools } = await MCPDiscoveryLoader.load({
    endpoint: 'https://my-mcp-server.com',
    apiKey: process.env.MCP_API_KEY,
    serviceName: 'myMcp',
  });

  registry.register({ tools });

  const agent = new Agent(adapter, { tools: registry });
})();