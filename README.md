![NPM Version](https://img.shields.io/npm/v/agnostic-agents) ![NPM Downloads](https://img.shields.io/npm/dy/agnostic-agents)

# agnostic-agents

A Node.js runtime for building provider-agnostic AI agents with tool calling, persistent runs, approvals, workflows, layered memory, and grounded retrieval.

## Install

```bash
npm install agnostic-agents
```

## What it includes

- `Agent`: runtime-backed agent execution with tool calling, approvals, pause/resume, cancellation, memory context, retrieval augmentation, and multimodal helper methods.
- `Tool`: JSON Schema based tool definition that adapters can export to provider-specific formats.
- `Run` / `RunInspector`: inspectable run model with events, checkpoints, timings, usage, and errors.
- `Workflow` / `WorkflowStep` / `AgentWorkflowStep` / `WorkflowRunner`: dependency-aware orchestration built on the runtime.
- `Memory`: layered memory for conversation, working, profile, policy, and semantic storage.
- `RAG`: grounded retrieval helper with provenance, reranking, retrievers, Pinecone support, or the built-in `LocalVectorStore`.
- `FallbackRouter`: capability-aware provider fallback routing.
- `EventBus` / `ConsoleDebugSink`: structured runtime events and debug sinks.
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

## Runtime example

`Agent.run()` returns an inspectable `Run` object. This is the maintained path for runtime features like approvals, checkpoints, pause/resume, and inspection.

```js
const {
  Agent,
  Tool,
  OpenAIAdapter,
  RunInspector,
} = require('agnostic-agents');

const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY, {
  model: 'gpt-4o-mini',
});

const sendUpdate = new Tool({
  name: 'send_status_update',
  description: 'Send a short status update to a recipient.',
  parameters: {
    type: 'object',
    properties: {
      recipient: { type: 'string' },
      summary: { type: 'string' },
    },
    required: ['recipient', 'summary'],
  },
  metadata: {
    executionPolicy: 'require_approval',
    sideEffectLevel: 'external_write',
  },
  implementation: async ({ recipient, summary }) => ({
    delivered: true,
    recipient,
    summary,
  }),
});

const agent = new Agent(adapter, {
  tools: [sendUpdate],
  description: 'Use tools when required and ask for approval before side effects.',
});

let run = await agent.run({
  input: 'Send Paulo a short update saying the v2 runtime is ready.',
});

if (run.status === 'waiting_for_approval') {
  run = await agent.resumeRun(run.id, {
    approval: { approved: true, reason: 'approved in demo' },
  });
}

console.log(run.output);
console.log(new RunInspector().inspect(run));
```

## Memory example

```js
const { Agent, Memory, OpenAIAdapter } = require('agnostic-agents');

const memory = new Memory();
const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY), {
  memory,
  description: 'You remember earlier turns and task context.',
});

memory.setWorkingMemory('current_project', 'Build the v2 runtime release.');
memory.setPolicy('external_updates', 'Ask for approval before sending external updates.');

await agent.sendMessage('My favorite city is Lisbon.');
const answer = await agent.sendMessage('What city did I mention?');
console.log(answer);
```

## Retrieval example

`Agent` uses retrieval as prompt augmentation when a `rag` instance is provided. Retrieval results are available with provenance and can be inspected on runs. To use the built-in local store, the adapter must support embeddings.

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

## Workflow example

```js
const {
  Agent,
  Workflow,
  AgentWorkflowStep,
  WorkflowRunner,
  OpenAIAdapter,
} = require('agnostic-agents');

const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY);

const researcher = new Agent(adapter, {
  description: 'Produce concise factual bullet points.',
});

const writer = new Agent(adapter, {
  description: 'Turn findings into short status updates.',
});

const workflow = new Workflow({
  id: 'daily-sync',
  steps: [
    new AgentWorkflowStep({
      id: 'research',
      agent: researcher,
      prompt: 'List three runtime capabilities in bullet form.',
    }),
    new AgentWorkflowStep({
      id: 'draft_update',
      agent: writer,
      dependsOn: ['research'],
      prompt: ({ results }) =>
        `Turn this research into a short update:\n${results.research.output}`,
    }),
  ],
});

const runner = new WorkflowRunner();
const run = await runner.run(workflow, { input: 'Prepare a daily sync update' });
console.log(run.output);
```

## Tool contract

Each tool uses one canonical shape:

- `name`
- `description`
- `parameters` as JSON Schema
- `implementation(args, context)`

The agent validates tool arguments against `parameters`, applies schema defaults, and executes the tool before asking the model for a final response.

## Examples

- `npm run example:local-tool`
- `npm run example:local-rag`
- `npm run example:local-rag-tool`
- `npm run example:openai`
- `npm run example:gemini`
- `npm run example:openai-runtime`

Additional examples live in [`examples/`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples).

Maintained `v1` examples are documented in [`examples/README.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/README.md).

## Current v2 scope

This package currently targets:

- provider-agnostic tool calling
- inspectable runs with checkpoints and events
- approval-gated, pausable, resumable, and cancellable execution
- layered memory
- grounded retrieval with provenance
- workflow orchestration on top of the runtime
- provider fallback routing
- MCP tool discovery

Legacy `Task` and `Orchestrator` remain for compatibility, but the maintained orchestration layer is `Workflow` / `WorkflowRunner`.

Some adapters expose extra audio, image, or video methods, but support varies by provider.

## Adapter capabilities

Each adapter exposes `getCapabilities()` with the normalized capability map:

- `generateText`
- `toolCalling`
- `embeddings`
- `imageAnalysis`
- `imageGeneration`
- `audioTranscription`
- `audioGeneration`
- `videoAnalysis`
- `videoGeneration`

Use this to decide whether to expose optional features in your app.

See [`docs/provider-compatibility.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/provider-compatibility.md) for provider-specific notes.

## Development

```bash
npm test
```

Available test commands:

```bash
npm run test:unit
npm run test:integration
npm run test:live
npm run test:all
```

Live tests use `.env` keys and only run when `RUN_LIVE_API_TESTS=1` is set by the script. Provider-account limitations such as quota, billing, or model availability are treated as skippable smoke-test conditions rather than framework failures.

Detailed command and environment documentation is available in [`docs/testing.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/testing.md).

Package publish contents are documented in [`docs/package-audit.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/package-audit.md).

The maintained runtime demo is:

```bash
npm run example:openai-runtime
```
