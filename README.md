![NPM Version](https://img.shields.io/npm/v/agnostic-agents) ![NPM Downloads](https://img.shields.io/npm/dy/agnostic-agents)

# agnostic-agents

`agnostic-agents` is a Node.js runtime OS for building provider-agnostic agent systems.

It is designed for projects that need more than a chat wrapper:

- inspectable runs
- checkpoints and replay
- approvals and policy-gated tools
- workflows and delegation
- grounded retrieval and layered memory
- distributed handoff across processes or services
- evals, benchmarks, and incident analysis

The package also now includes a separate coordination layer above the runtime for:

- structured critique
- disagreement resolution
- task decomposition
- coordination benchmarks

## Install

```bash
npm install agnostic-agents
```

The package ships a maintained `index.d.ts`, so TypeScript projects get typed access to the public surface without extra setup.

## What This Package Is Good For

Use `agnostic-agents` when you want:

- a single-agent runtime with tools, approvals, memory, and replay
- a workflow runner with explicit steps and child-run lineage
- a provider-agnostic execution layer behind one adapter contract
- a runtime substrate for higher-level worker or organization systems
- a package that keeps control, observability, and governance in the open

Do not think of it as only a prompt helper or a chat abstraction. The maintained direction is a runtime control layer for serious agent systems.

## Fastest Start

If you just want a working tool-using agent, start here:

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
      expression: { type: 'string' },
    },
    required: ['expression'],
  },
  implementation: async ({ expression }) => ({
    result: Function(`"use strict"; return (${expression})`)(),
  }),
});

const agent = new Agent(adapter, {
  tools: [calculator],
  description: 'Use tools when they help.',
  defaultConfig: { temperature: 0.2, maxTokens: 300 },
});

const answer = await agent.sendMessage('What is 12 * 7?');
console.log(answer);
```

If you want the maintained runtime path instead of the shortest chat path, use `Agent.run()`:

```js
const { Agent, Tool, OpenAIAdapter, RunInspector } = require('agnostic-agents');

const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY, {
  model: 'gpt-4o-mini',
});

const sendUpdate = new Tool({
  name: 'send_status_update',
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
  verifier: adapter,
  defaultConfig: { selfVerify: true },
});

let run = await agent.run('Send Paulo a short update saying the runtime is ready.');

if (run.status === 'waiting_for_approval') {
  run = await agent.resumeRun(run.id, {
    approved: true,
    reason: 'approved in demo',
  });
}

console.dir(RunInspector.summarize(run), { depth: null });
```

## Core Surfaces

### Runtime

The maintained runtime surface centers on:

- `Agent`
- `Run`
- `RunInspector`
- `ToolPolicy`
- `ApprovalInbox`
- `GovernanceHooks`

That gives you:

- pause/resume/cancel
- tool approval gating
- replay and branching
- structured events
- run inspection and trace export

### Workflow and Delegation

For explicit multi-step work, use:

- `Workflow`
- `WorkflowStep`
- `AgentWorkflowStep`
- `WorkflowRunner`
- `DelegationRuntime`
- `DelegationContract`

This is the maintained orchestration layer. Legacy `Task` and `Orchestrator` remain only for compatibility.

Example:

```js
const {
  Agent,
  Workflow,
  AgentWorkflowStep,
  WorkflowRunner,
  DelegationRuntime,
  DelegationContract,
  OpenAIAdapter,
} = require('agnostic-agents');

const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY);
const delegationRuntime = new DelegationRuntime();

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
      delegationRuntime,
      delegationContract: new DelegationContract({
        id: 'research-contract',
        assignee: 'researcher',
        requiredInputs: ['prompt'],
      }),
      prompt: 'List three runtime capabilities in bullet form.',
    }),
    new AgentWorkflowStep({
      id: 'draft_update',
      agent: writer,
      dependsOn: ['research'],
      delegationRuntime,
      delegationContract: new DelegationContract({
        id: 'writer-contract',
        assignee: 'writer',
        requiredInputs: ['prompt'],
      }),
      prompt: ({ results }) => `Turn this research into a short update:\n${results.research.output}`,
    }),
  ],
});

const run = await new WorkflowRunner({ workflow }).run('Prepare a daily sync update');
console.log(run.output);
```

### Memory and Retrieval

Use:

- `Memory` for conversation, working, profile, policy, and semantic layers
- `RAG` for grounded retrieval with provenance

```js
const { Agent, Memory, RAG, LocalVectorStore, OpenAIAdapter } = require('agnostic-agents');

const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY);
const memory = new Memory();
const rag = new RAG({
  adapter,
  vectorStore: new LocalVectorStore(),
});

await rag.index(['Runtime control requires replay, branching, and inspection.']);
await memory.setWorkingMemory('current_project', 'Validate the runtime release');

const agent = new Agent(adapter, {
  memory,
  rag,
  description: 'Use retrieved context when relevant.',
});

console.log(await agent.sendMessage('What does runtime control require?'));
```

### Distributed Execution

Use shared stores plus distributed envelopes when one process creates a run and another continues it.

```js
const { Agent, FileRunStore } = require('agnostic-agents');

const runStore = new FileRunStore({ directory: './runtime-runs' });
const processA = new Agent(adapterA, { runStore });
const processB = new Agent(adapterB, { runStore });

const run = await processA.run('Prepare the handoff.');
const envelope = await processA.createDistributedEnvelope(run.id, {
  action: 'replay',
  checkpointId: run.checkpoints[run.checkpoints.length - 1].id,
  metadata: { handoffTarget: 'worker-b', transport: 'service_call' },
});

const remoteRun = await processB.continueDistributedRun(envelope);
console.log(remoteRun.status);
```

### Coordination Layer

Above the runtime core, the package now includes:

- `CritiqueProtocol`
- `CritiqueSchemaRegistry`
- `TrustRegistry`
- `DisagreementResolver`
- `CoordinationLoop`
- `DecompositionAdvisor`
- `CoordinationBenchmarkSuite`

This layer is for:

- structured critique records
- trust-weighted disagreement handling
- decomposition recommendations
- coordination evals and benchmarks

It is intentionally separate from the runtime kernel.

### Policy and Governance

Use:

- `ToolPolicy` for raw policy logic
- `ExtensionHost` for contributed policy and governance behavior
- `ProductionPolicyPack` for a maintained production-oriented preset
- `ApprovalInbox` and `GovernanceHooks` for operator-facing control

This means users can add or mutate policy dynamically without patching core runtime code.

## Provider Surface

The package supports multiple providers behind one adapter contract.

Shared maintained contract:

- `generateText()`
- `getCapabilities()`
- `supports(capability)`

Capability support and certification vary by provider. Use these docs instead of assuming parity:

- [Provider compatibility](docs/provider-compatibility.md)
- [Provider certification](docs/provider-certification.md)
- [Support matrix](docs/support-matrix.md)
- [Provider quickstarts](docs/provider-quickstarts.md)

If you want the strongest maintained end-to-end path today, start with OpenAI.

## Maintained Examples

Local/no-key examples:

- `npm run example:local-tool`
- `npm run example:local-rag`
- `npm run example:local-rag-tool`
- `npm run example:reference-worker`
- `npm run example:reference-incident`
- `npm run example:reference-operator`
- `npm run example:reference-evals`
- `npm run example:reference-replay-benchmarks`
- `npm run example:reference-adaptive-benchmarks`
- `npm run example:reference-v7-audit`
- `npm run example:reference-coordination-review`
- `npm run example:reference-decomposition-advisor`
- `npm run example:reference-coordination-benchmarks`
- `npm run example:reference-production-policy-pack`
- `npm run example:reference-file-backed-stack`
- `npm run example:reference-worker-coordination-benchmarks`
- `npm run example:reference-openapi`
- `npm run example:reference-durable-backends`
- `npm run example:reference-distributed-handoff`
- `npm run example:reference-distributed-incident`
- `npm run example:reference-remote-control-plane`
- `npm run example:reference-deployment-split`
- `npm run example:reference-distributed-recovery`

Provider-backed examples:

- `npm run example:openai`
- `npm run example:gemini`
- `npm run example:openai-runtime`
- `npm run example:openai-v3-runtime`
- `npm run example:openai-v4-runtime`

See [examples/README.md](examples/README.md) for labels and intent.

## Recommended Starting Paths

If you are new to the package:

1. start with `local-tool` or `openai`
2. move to `Agent.run()` and `RunInspector`
3. add `ToolPolicy` and `ApprovalInbox` if side effects matter
4. add `WorkflowRunner` and delegation if you need explicit orchestration
5. move to file-backed or split deployment references when persistence and operations matter

If you are evaluating the package for serious runtime usage:

1. read [docs/reference-integrations.md](docs/reference-integrations.md)
2. read [docs/common-stack-integrations.md](docs/common-stack-integrations.md)
3. run `reference-file-backed-stack`
4. run `reference-deployment-split`
5. review [docs/operator-workflows.md](docs/operator-workflows.md)

## Documentation Map

API and package surface:

- [API reference](docs/api-reference.md)
- [API stability policy](docs/api-stability-policy.md)
- [Migration guides](docs/migration-guides.md)

Runtime operations:

- [Reference integrations](docs/reference-integrations.md)
- [Common stack integrations](docs/common-stack-integrations.md)
- [Operator workflows](docs/operator-workflows.md)
- [Operator architecture](docs/operator-architecture.md)
- [Distributed execution](docs/distributed-execution.md)
- [Remote control planes](docs/remote-control-planes.md)
- [Distributed identities](docs/distributed-identities.md)
- [Storage backends](docs/storage-backends.md)

Policy, governance, and security:

- [Policy and governance packs](docs/policy-governance-packs.md)
- [Secret handling](docs/secret-handling.md)
- [Tool auth propagation](docs/tool-auth-propagation.md)

Evals and ecosystem:

- [Benchmarking](docs/benchmarking.md)
- [Benchmark fixtures](docs/benchmark-fixtures.md)
- [Plugin authoring](docs/plugin-authoring.md)
- [Extension certification and compatibility](docs/extension-certification.md)
- [Runtime extension contributor guidance](docs/runtime-extension-contributors.md)
- [MCP interoperability](docs/mcp-interoperability.md)
- [OpenAPI examples](docs/openapi-examples.md)
- [Cookbook](docs/cookbook.md)

Provider guidance:

- [Provider quickstarts](docs/provider-quickstarts.md)
- [Provider compatibility](docs/provider-compatibility.md)
- [Provider certification](docs/provider-certification.md)
- [Support matrix](docs/support-matrix.md)

## Development

Run the maintained test suites with:

```bash
npm test
```

Other useful commands:

```bash
npm run test:unit
npm run test:integration
npm run test:live
npm run test:all
npm run test:coverage
```

## Current Scope

This package currently targets:

- provider-agnostic runtime execution
- inspectable runs with replay and lineage
- approval-gated tool execution
- layered memory and grounded retrieval
- explicit workflows and delegation
- distributed handoff and recovery
- adaptive runtime tuning and operator-facing evals
- a separate coordination layer above the runtime

It does not try to be:

- a hosted control plane
- a closed worker-management product
- a provider-specific framework disguised as a generic runtime
