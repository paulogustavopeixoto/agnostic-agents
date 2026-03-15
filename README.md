![NPM Version](https://img.shields.io/npm/v/agnostic-agents) ![NPM Downloads](https://img.shields.io/npm/dy/agnostic-agents)

# agnostic-agents

A Node.js toolkit for building provider-agnostic AI agents with tool calling, memory, optional retrieval, and workflow utilities.

## Install

```bash
npm install agnostic-agents
```

## What it includes

- `Agent`: chat loop with tool execution, memory context, optional retrieval augmentation, and multimodal helper methods.
- `Tool`: JSON Schema based tool definition that adapters can export to provider-specific formats.
- `Memory`: lightweight conversation and entity memory.
- `RAG`: retrieval helper for Pinecone or the built-in `LocalVectorStore`.
- `MCPClient` / `MCPTool` / `MCPDiscoveryLoader`: connect to Model Context Protocol tool sources.
- `RetryManager`: retry wrapper for adapters and workflows.

## Quick start

```js
const { Agent, Tool, OpenAIAdapter } = require('agnostic-agents');

const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY, {
  model: 'gpt-4o-mini',
});

const calculator = new Tool({
  name: 'calculate',
  description: 'Evaluate a basic arithmetic expression.',
  parameters: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'Expression like 12 * 7' },
    },
    required: ['expression'],
  },
  implementation: async ({ expression }) => ({
    result: Function(`"use strict"; return (${expression})`)(),
  }),
});

const agent = new Agent(adapter, {
  tools: [calculator],
  description: 'You are a concise assistant. Use tools when they help.',
  defaultConfig: { temperature: 0.2, maxTokens: 300 },
});

const response = await agent.sendMessage('What is 12 * 7?');
console.log(response);
```

## Memory example

```js
const { Agent, Memory, OpenAIAdapter } = require('agnostic-agents');

const memory = new Memory();
const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY), {
  memory,
  description: 'You remember earlier turns.',
});

await agent.sendMessage('My favorite city is Lisbon.');
const answer = await agent.sendMessage('What city did I mention?');
console.log(answer);
```

## Retrieval example

`Agent` uses retrieval as prompt augmentation when a `rag` instance is provided. To use the built-in local store, the adapter must support embeddings.

```js
const {
  Agent,
  RAG,
  LocalVectorStore,
  OpenAIAdapter,
} = require('agnostic-agents');

const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY);
const rag = new RAG({
  adapter,
  vectorStore: new LocalVectorStore(),
});

await rag.index(['AI ethics involves fairness, transparency, and accountability.']);

const agent = new Agent(adapter, {
  rag,
  description: 'Use retrieved context when it is relevant.',
});

const answer = await agent.sendMessage('What does AI ethics involve?');
console.log(answer);
```

## Tool contract

Each tool uses one canonical shape:

- `name`
- `description`
- `parameters` as JSON Schema
- `implementation(args, context)`

The agent validates tool arguments against `parameters`, applies schema defaults, and executes the tool before asking the model for a final response.

## Examples

- `npm run example:openai`
- `npm run example:gemini`

Additional examples live in [`examples/`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples).

## Current v1 scope

This package currently targets:

- provider-agnostic tool calling
- conversation and entity memory
- retrieval augmentation
- MCP tool discovery

Some adapters expose extra audio, image, or video methods, but support varies by provider.

## Development

```bash
npm test
```
