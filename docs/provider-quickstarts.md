# Provider Quickstarts

These are the maintained copy-paste starting points for the supported providers in `agnostic-agents`.

Each snippet is intentionally minimal:

- load the adapter
- define one local tool
- run one agent call

For certification level and capability notes, see [`docs/provider-compatibility.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/provider-compatibility.md).

## Shared pattern

All quickstarts use the same runtime shape:

```js
const { Agent, Tool } = require('agnostic-agents');
```

Then:

- create an adapter
- create a tool
- create an agent
- call `sendMessage(...)` or `run(...)`

## OpenAI

Environment:

- `OPENAI_API_KEY`

```js
const { Agent, Tool, OpenAIAdapter } = require('agnostic-agents');

const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY, {
  model: 'gpt-4o-mini',
});

const tool = new Tool({
  name: 'get_weather',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string' },
    },
    required: ['location'],
  },
  implementation: async ({ location }) => ({
    location,
    forecast: 'Sunny',
    temperatureC: 21,
  }),
});

const agent = new Agent(adapter, {
  tools: [tool],
  description: 'You are a concise assistant. Use tools when needed.',
});

const response = await agent.sendMessage('What is the weather in Lisbon?');
console.log(response);
```

Reference example:

- [`examples/openaiExample.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/openaiExample.js)

## Gemini

Environment:

- `GEMINI_API_KEY`

```js
const { Agent, Tool, GeminiAdapter } = require('agnostic-agents');

const adapter = new GeminiAdapter(process.env.GEMINI_API_KEY, {
  model: process.env.GEMINI_TEST_MODEL || 'gemini-2.0-flash',
});

const tool = new Tool({
  name: 'calculate',
  parameters: {
    type: 'object',
    properties: {
      expression: { type: 'string' },
    },
    required: ['expression'],
  },
  implementation: async ({ expression }) => ({
    result: Function(`"use strict"; return (${expression})`)(),
  }),
});

const agent = new Agent(adapter, {
  tools: [tool],
  description: 'You are a concise assistant. Use tools when they help.',
});

const response = await agent.sendMessage('What is 12 * 7?');
console.log(response);
```

Reference example:

- [`examples/geminiExample.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/geminiExample.js)

## Anthropic

Environment:

- `ANTHROPIC_API_KEY`

```js
const { Agent, Tool, AnthropicAdapter } = require('agnostic-agents');

const adapter = new AnthropicAdapter(process.env.ANTHROPIC_API_KEY, {
  model: process.env.ANTHROPIC_TEST_MODEL || 'claude-3-5-haiku-latest',
});

const tool = new Tool({
  name: 'summarize_topic',
  parameters: {
    type: 'object',
    properties: {
      topic: { type: 'string' },
    },
    required: ['topic'],
  },
  implementation: async ({ topic }) => ({
    topic,
    summary: `Short summary for ${topic}`,
  }),
});

const agent = new Agent(adapter, {
  tools: [tool],
  description: 'You are a concise assistant. Use tools when they help.',
});

const response = await agent.sendMessage('Use the tool to summarize the topic: runtime control');
console.log(response);
```

Reference example:

- [`examples/anthropicExample.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/anthropicExample.js)

## Hugging Face

Environment:

- `HUGGINGFACE_API_KEY`

```js
const { Agent, Tool, HFAdapter } = require('agnostic-agents');

const adapter = new HFAdapter(process.env.HUGGINGFACE_API_KEY, {
  model: process.env.HUGGINGFACE_TEST_MODEL || 'Qwen/Qwen2.5-72B-Instruct',
});

const tool = new Tool({
  name: 'lookup_fact',
  parameters: {
    type: 'object',
    properties: {
      topic: { type: 'string' },
    },
    required: ['topic'],
  },
  implementation: async ({ topic }) => ({
    topic,
    fact: `Example fact about ${topic}`,
  }),
});

const agent = new Agent(adapter, {
  tools: [tool],
  description: 'You are a concise assistant. Use tools when they help.',
});

const response = await agent.sendMessage('Use the tool to look up a fact about Lisbon.');
console.log(response);
```

Reference example:

- [`examples/huggingFaceExample.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/huggingFaceExample.js)

## DeepSeek

Environment:

- `DEEPSEEK_API_KEY`

```js
const { Agent, Tool, DeepSeekAdapter } = require('agnostic-agents');

const adapter = new DeepSeekAdapter(process.env.DEEPSEEK_API_KEY, {
  model: process.env.DEEPSEEK_TEST_MODEL || 'deepseek-chat',
});

const tool = new Tool({
  name: 'lookup_status',
  parameters: {
    type: 'object',
    properties: {
      item: { type: 'string' },
    },
    required: ['item'],
  },
  implementation: async ({ item }) => ({
    item,
    status: 'ok',
  }),
});

const agent = new Agent(adapter, {
  tools: [tool],
  description: 'You are a concise assistant. Use tools when they help.',
});

const response = await agent.sendMessage('Use the tool to check the status of runtime control.');
console.log(response);
```

Reference example:

- [`examples/deepseekExample.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/deepseekExample.js)

## When to move beyond these snippets

These quickstarts are for:

- first setup
- smoke verification
- provider comparison

Move to the runtime demos and reference integrations when you need:

- approvals
- replay or branching
- workflows
- governance hooks
- incident debugging
- scheduling
