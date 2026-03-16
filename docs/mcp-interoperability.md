# MCP Interoperability Guide

This guide explains the maintained Model Context Protocol interoperability surfaces in `agnostic-agents`.

The package is currently strongest on the MCP client side:

- connect to an MCP endpoint
- discover tools
- convert them into runtime `Tool` objects
- execute them through the normal agent runtime

## Maintained MCP surfaces

- `MCPClient`
- `MCPTool`
- `MCPDiscoveryLoader`

These let you integrate with MCP-compatible tool providers without making MCP a special runtime path.

The design principle is:

- MCP tools should look like normal tools inside the runtime

## 1. Direct MCP client usage

Use `MCPClient` when you want explicit control over discovery and execution.

```js
const { MCPClient } = require('agnostic-agents');

const client = new MCPClient({
  endpoint: process.env.MCP_ENDPOINT,
  apiKey: process.env.MCP_API_KEY,
});

const tools = await client.listTools();
console.log(tools);
```

Then execute a tool:

```js
const result = await client.execute('search_docs', { query: 'runtime replay' });
console.log(result);
```

## 2. Convert discovered MCP tools into runtime tools

Use `toTools()` when you want MCP-discovered tools to flow into `Agent` just like local tools.

```js
const { Agent, MCPClient } = require('agnostic-agents');

const client = new MCPClient({
  endpoint: process.env.MCP_ENDPOINT,
  apiKey: process.env.MCP_API_KEY,
});

const tools = await client.toTools();
const agent = new Agent(adapter, { tools });
```

This is the simplest interoperability path.

## 3. Wrap a specific MCP tool with `MCPTool`

Use `MCPTool` when you already know the remote MCP tool you want and do not need broad discovery.

```js
const { Agent, MCPTool } = require('agnostic-agents');

const tool = new MCPTool({
  name: 'search_docs',
  description: 'Search remote docs over MCP',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string' },
    },
    required: ['query'],
  },
  mcpClient: client,
});

const agent = new Agent(adapter, { tools: [tool] });
```

## 4. Use `MCPDiscoveryLoader` for loader-style integration

Use `MCPDiscoveryLoader` when you want MCP tools to enter the system through the loader/discovery path.

Reference example:

- [`examples/MCPDiscoveryLoaderExample.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/MCPDiscoveryLoaderExample.js)

This is the best fit when MCP discovery is part of a broader tool-loading workflow.

## How MCP fits into the runtime

Once loaded, MCP-backed tools should behave like any other runtime tool:

- they can be governed by `ToolPolicy`
- they can participate in approvals
- they emit runtime events
- they appear in run inspection and traces

That is the interoperability rule:

- MCP should integrate into the runtime, not bypass it

## Auth and secret handling

For MCP connections:

- keep `apiKey` in host-controlled configuration
- do not put MCP credentials in model-visible prompts
- use the secret-handling guide in [`docs/secret-handling.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/secret-handling.md)

## Current boundary

This package currently documents and maintains:

- MCP client interoperability
- MCP tool discovery/loading
- MCP-backed runtime tool execution

It does not currently ship a maintained MCP server implementation.

That distinction matters for support claims.

## Related docs

- [`docs/plugin-authoring.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/plugin-authoring.md)
- [`docs/provider-quickstarts.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/provider-quickstarts.md)
- [`docs/secret-handling.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/secret-handling.md)
