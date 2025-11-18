![NPM Version](https://img.shields.io/npm/v/agnostic-agents) ![NPM Downloads](https://img.shields.io/npm/dy/agnostic-agents)

# agnostic-agents

A provider-agnostic toolkit for building resilient AI agents that can plan work, call tools, use memory, and mix RAG with multiple LLM providers.

## Why use it

- Provider agnostic: swap OpenAI, Anthropic, DeepSeek, Gemini, or Hugging Face without changing your agent code.
- First-class tools: universal JSON schema, validation, and automatic conversion to provider-native function specs.
- RAG + tools together: fetch context from Pinecone or a local store, then let tools act on it.
- Planning and orchestration: Planner/Plan/Task/Orchestrator handle workflows (sequential, parallel, hierarchical).
- Resilient by default: retries, missing-argument resolution, and optional user/console prompts for clarification.
- Extensible: plug in new adapters, tools, vectors, triggers, and webhooks.

## Install

```bash
npm install agnostic-agents
```

## Quick start

Create an agent with memory, a tool, and local RAG. Set `OPENAI_API_KEY` (or another provider key) in your env.

```js
const {
  Agent,
  Memory,
  Tool,
  RAG,
  OpenAIAdapter,
  LocalVectorStore,
  RetryManager,
} = require("agnostic-agents");

const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY);
const retryManager = new RetryManager({ retries: 2 });

// RAG: index a small fact into an in-memory vector store
const vectorStore = new LocalVectorStore();
const rag = new RAG({ adapter, vectorStore, retryManager });
await rag.index(["AI ethics involve fairness and transparency."]);

// Tool: simple calculator (use eval cautiously in production)
const calculatorTool = new Tool({
  name: "calculate",
  description: "Perform arithmetic calculations.",
  parameters: {
    type: "object",
    properties: { expression: { type: "string", description: "e.g., '12 * 7'" } },
    required: ["expression"],
  },
  implementation: async ({ expression }) => ({ result: eval(expression) }),
});

const agent = new Agent(adapter, {
  tools: [calculatorTool],
  memory: new Memory(),
  rag,
  retryManager,
  defaultConfig: { model: "gpt-4o-mini", temperature: 0.7 },
  description: "A helpful assistant with calculation and ethics knowledge.",
});

console.log(await agent.sendMessage("What is 12 * 7?")); // tool call
console.log(await agent.sendMessage("What are AI ethics?")); // RAG + generation
```

## Capabilities at a glance

- `Agent`: chat core with tool calling, memory, images (adapter dependent), and RAG.
- `Tool`: universal schema + validation; exports to provider-native function/tool specs.
- `Memory`: lightweight conversation history for prompt context.
- `RAG`: chunk, index, search, and generate using Pinecone or the built-in local store.
- `Planner` / `Plan` / `PlanExecutor`: create and execute flexible plans.
- `Task` / `Orchestrator`: compose tasks sequentially, in parallel, or hierarchically with retries.
- `RetryManager`: exponential backoff retries for any async work.
- `PluginLoader` / `MCPDiscoveryLoader`: discover tools from Plugins or the Model Context Protocol.

## Adapters (LLM)

- OpenAI, Anthropic, DeepSeek (experimental), Gemini, Hugging Face.
- Easily add your own by implementing the adapter interface.

## RAG options

- `LocalVectorStore`: in-memory, great for quick start or tests.
- `PineconeManager`: persistent vectors with namespaces and index utilities.

## Examples

- `examples/openaiExample.js`: minimal chat + tool calling.
- `examples/agentWithMultipleToolsAndMemory.js`: combine tools with memory.
- `examples/agentPlannerExample.js`: planning + execution.
- `examples/MCPDiscoveryLoaderExample.js`: discover MCP tools.
- `examples/openApiExample.js` and `examples/tools/calcom.js`: generate tools from OpenAPI / Cal.com.

## Contributing

Issues and PRs are welcome. If you add a provider, tool adapter, or vector store, include a small example and tests where possible.
