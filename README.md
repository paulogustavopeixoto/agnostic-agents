![NPM Version](https://img.shields.io/npm/v/agnostic-agents) ![NPM Downloads](https://img.shields.io/npm/dy/agnostic-agents)
```
_____/\\\\\\\\\________/\\\\\\\\\\\\__/\\\\\_____/\\\_______/\\\\\__________/\\\\\\\\\\\____/\\\\\\\\\\\\\\\__/\\\\\\\\\\\________/\\\\\\\\\_______________/\\\\\\\\\________/\\\\\\\\\\\\__/\\\\\\\\\\\\\\\__/\\\\\_____/\\\__/\\\\\\\\\\\\\\\_____/\\\\\\\\\\\___        
 ___/\\\\\\\\\\\\\____/\\\//////////__\/\\\\\\___\/\\\_____/\\\///\\\______/\\\/////////\\\_\///////\\\/////__\/////\\\///______/\\\////////______________/\\\\\\\\\\\\\____/\\\//////////__\/\\\///////////__\/\\\\\\___\/\\\_\///////\\\/////____/\\\/////////\\\_       
  __/\\\/////////\\\__/\\\_____________\/\\\/\\\__\/\\\___/\\\/__\///\\\___\//\\\______\///________\/\\\___________\/\\\_______/\\\/______________________/\\\/////////\\\__/\\\_____________\/\\\_____________\/\\\/\\\__\/\\\_______\/\\\________\//\\\______\///__      
   _\/\\\_______\/\\\_\/\\\____/\\\\\\\_\/\\\//\\\_\/\\\__/\\\______\//\\\___\////\\\_______________\/\\\___________\/\\\______/\\\_______________________\/\\\_______\/\\\_\/\\\____/\\\\\\\_\/\\\\\\\\\\\_____\/\\\//\\\_\/\\\_______\/\\\_________\////\\\_________     
    _\/\\\\\\\\\\\\\\\_\/\\\___\/////\\\_\/\\\\//\\\\/\\\_\/\\\_______\/\\\______\////\\\____________\/\\\___________\/\\\_____\/\\\_______________________\/\\\\\\\\\\\\\\\_\/\\\___\/////\\\_\/\\\///////______\/\\\\//\\\\/\\\_______\/\\\____________\////\\\______    
     _\/\\\/////////\\\_\/\\\_______\/\\\_\/\\\_\//\\\/\\\_\//\\\______/\\\__________\////\\\_________\/\\\___________\/\\\_____\//\\\______________________\/\\\/////////\\\_\/\\\_______\/\\\_\/\\\_____________\/\\\_\//\\\/\\\_______\/\\\_______________\////\\\___   
      _\/\\\_______\/\\\_\/\\\_______\/\\\_\/\\\__\//\\\\\\__\///\\\__/\\\_____/\\\______\//\\\________\/\\\___________\/\\\______\///\\\____________________\/\\\_______\/\\\_\/\\\_______\/\\\_\/\\\_____________\/\\\__\//\\\\\\_______\/\\\________/\\\______\//\\\__  
       _\/\\\_______\/\\\_\//\\\\\\\\\\\\/__\/\\\___\//\\\\\____\///\\\\\/_____\///\\\\\\\\\\\/_________\/\\\________/\\\\\\\\\\\____\////\\\\\\\\\___________\/\\\_______\/\\\_\//\\\\\\\\\\\\/__\/\\\\\\\\\\\\\\\_\/\\\___\//\\\\\_______\/\\\_______\///\\\\\\\\\\\/___ 
        _\///________\///___\////////////____\///_____\/////_______\/////_________\///////////___________\///________\///////////________\/////////____________\///________\///___\////////////____\///////////////__\///_____\/////________\///__________\///////////_____
```

# agnostic-agents

## Overview

**agnostic-agents** is a modular, provider-agnostic framework for building and orchestrating AI agents. It supports integration with multiple language model providers (e.g., OpenAI, DeepSeek, Gemini, Anthropic, Hugging Face) and offers abstractions for conversation memory, function calling (tools), task execution, team orchestration, and retrieval-augmented generation (RAG). Whether you're creating chatbots, automating workflows, or building collaborative AI teams, this package provides a flexible and resilient toolkit.

### Key Features

- **Provider-Agnostic**: Switch between LLM providers with minimal changes.
- **RAG Support**: Augment agents and tasks with retrieval from vector stores (e.g., Pinecone or local).
- **Task Orchestration**: Execute tasks sequentially, in parallel, or hierarchically.
- **Resilience**: Built-in retry logic for handling transient API failures.
- **Extensibility**: Easily add new adapters, tools, or vector stores.

## Installation

Install via npm:

```bash
npm install agnostic-agents --save
```

## Quick Start

Here’s an example of an AI agent with memory, a tool, and RAG capabilities:

```bash
const { Agent, Memory, Tool, RAG, OpenAIAdapter, LocalVectorStore, RetryManager } = require('agnostic-agents');
require('dotenv').config();

(async () => {
  // Setup adapter and retry manager
  const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY);
  const retryManager = new RetryManager({ retries: 2 });

  // Setup RAG with a local vector store
  const vectorStore = new LocalVectorStore();
  const rag = new RAG({ adapter, vectorStore, retryManager });
  await rag.index(["AI ethics involve fairness and transparency."]);

  // Define a calculator tool
  const calculatorTool = new Tool({
    name: "calculate",
    description: "Perform arithmetic calculations.",
    parameters: {
      type: "object",
      properties: { expression: { type: "string", description: "e.g., '12 * 7'" } },
      required: ["expression"]
    },
    implementation: async ({ expression }) => ({ result: eval(expression) }) // Use eval cautiously!
  });

  // Create agent with memory, tools, and RAG
  const memory = new Memory();
  const agent = new Agent(adapter, {
    tools: [calculatorTool],
    memory,
    defaultConfig: { model: "gpt-4o-mini", temperature: 0.7 },
    description: "A helpful assistant with calculation and ethics knowledge.",
    rag,
    retryManager
  });

  // Test the agent
  console.log(await agent.sendMessage("What is 12 * 7?")); // Calls calculator tool
  console.log(await agent.sendMessage("What are AI ethics?")); // Uses RAG
})();
```

## Classes Overview

| Class | Description |        
| ----- | ----------- |
| `Agent` | Core interaction unit—generates responses, handles tools, memory, and RAG queries. |
| `Task` | Executes a single task with dependencies, RAG context, and retries—workflow building block. |
| `Orchestrator` | Coordinates multiple tasks in sequential, parallel, or hierarchical modes with RAG support. |
| `RAG` | Retrieval-Augmented Generation—fetches context from vector stores for enhanced responses. |
| `Memory` | Stores conversation history—simple context management. |
| `Tool` | Defines callable functions—extends agent capabilities. |
| `RetryManager` | Handles retries with exponential backoff—ensures resilience for async operations. |
| `PineconeManager` | Vector store integration with Pinecone—persists RAG data externally. |
| `LocalVectorStore` | In-memory vector store—lightweight RAG option without external dependencies. |
| `OpenAIAdapter` | Integration with OpenAi. |
| `GeminiAdapter` | Integration with Gemini. |
| `DeepSeekAdapter` | Integration with DeepSeek. (UNSTABLE) |
| `AnthropicAdapter` | Integration with Anthropic. |
| `HFAdapter` | Integration with Hugging Face. |

## API Reference

`Agent`

**Constructor**

```bash
new Agent(adapter, { tools = [], memory = null, defaultConfig = {}, description = "", rag = null, retryManager = new RetryManager() })
```

- **adapter**: Provider adapter instance (e.g., OpenAIAdapter).
- **tools**: Array of Tool instances for function calling.
- **memory**: Optional Memory instance for conversation context.
- **defaultConfig**: Config options (e.g., { model, temperature, maxTokens }).
- **description**: System prompt or agent role description.
- **rag**: Optional RAG instance for retrieval-augmented generation.
- **retryManager**: Optional RetryManager for retry logic (defaults to 3 retries).

**Methods**

- `async sendMessage(userMessage, config = {})`
Sends a message to the agent, using RAG if enabled. Returns the response or tool result.
        - `userMessage`: String input.
        - `config`: `{ model, temperature, maxTokens, useRag }`—`useRag` toggles RAG (default: `true` if `rag` present).
        - Returns: `Promise<string>`.

- `async _handleToolCall(toolCall)`
Internal—executes a tool call if detected. Returns tool result.

- `async analyzeImage(imageData, config = {})`
Analyzes an image if supported by the adapter. Returns analysis result.
        - `imageData`: Buffer or URL/base64 string.
        - Returns: `Promise<string>`.

- `async generateImage(userPrompt, config = {})`
Generates an image from text if supported. Returns image data.
        - Returns: `Promise<string|Buffer>` (e.g., URL or base64).

`Task`

**Constructor**

```bash
new Task({ description, name, agent, tools, guardrail, input, expectedOutput, dependsOn = [], rag = null, timeout, retries, retryManager = new RetryManager() })
```

- **description**: Task goal (string).
- **name**: Optional identifier.
- **agent**: `Agent` instance to execute the task.
- **tools**: Array of `Tool` instances (overrides agent tools).
- **guardrail**: Optional validation function.
- **input**: Initial data (any).
- **expectedOutput**: Expected result description.
- **dependsOn**: Array of task names this depends on.
- **rag**: Optional `RAG` instance for context.
- **timeout, retries**: Placeholders (not implemented). (DEPRECATED)
- **retryManager**: Optional retry logic (defaults to 3 retries).

**Methods**

- `async run(context = {})`
Executes the task with context from dependencies and RAG. Returns output or throws on failure.
        - `context`: Object with dependency outputs.
        - Returns: `Promise<any>`.

- `async _buildPrompt(context = {})`
Builds the prompt with description, RAG context, dependencies, and input. Returns string.

`Orchestrator`

**Constructor**

```bash
new Orchestrator({ tasks, agents = [], process = "sequential", verbose = false, errorPolicy = "throw", retries = 0, rag = null })
```

- **tasks**: Array of `Task` instances.
- **agents**: Optional pool of agents.
- **process**: `"sequential"`, `"parallel"`, or `"hierarchical"`.
- **verbose**: Logs execution details if `true`.
- **errorPolicy**: `"throw"` or `"skip"` on failure.
- **retries**: Number of retries (task-level).
- **rag**: Optional shared `RAG` instance.

**Methods**

- `async kickoff(inputs = {})`
Executes tasks based on `process`. Returns `{ raw, tasksOutput }`.
        - `inputs`: Initial context object.
        - Returns: `Promise<object>`.


`RAG`

**Constructor**

```bash
new RAG({ adapter, vectorStore, indexName, chunkSize = 500, topK = 5, namespace, retryManager = new RetryManager() })
```

- **adapter**: LLM adapter for embeddings/generation.
- **vectorStore**: Vector store (e.g., `PineconeManager`, `LocalVectorStore`).
- **indexName**: Required for vector store operations.
- **chunkSize, topK, namespace**: RAG config.
- **retryManager**: Retry logic (defaults to 3 retries).

**Methods**

- `async query(prompt, options = {})`
Retrieves context and generates a response. Returns string.

- `async search(query, options = {})`
Retrieves text chunks. Returns `string[]`.

- `chunk(text, chunkSize)`
Splits text into chunks. Returns `string[]`.

- `async index(documents, options = {})`
Indexes text into the vector store. Returns `string[]` (IDs).

- `async delete(options = {})`
Deletes vectors or namespace. Returns void.

- `async listIndexes()`
Lists all indexes. Returns `string[]`.

- `async updateIndex(options = {})`
Updates index settings. Returns void.