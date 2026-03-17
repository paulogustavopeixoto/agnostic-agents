![NPM Version](https://img.shields.io/npm/v/agnostic-agents) ![NPM Downloads](https://img.shields.io/npm/dy/agnostic-agents)

# agnostic-agents

A Node.js runtime OS for building provider-agnostic agent systems with inspectable runs, replay, branching, approvals, workflows, layered memory, grounded retrieval, and multi-agent orchestration.

## Install

```bash
npm install agnostic-agents
```

The package ships a maintained `index.d.ts` so TypeScript projects get typed access to the public runtime surface without extra setup.

## What it includes

- `Agent`: runtime-backed agent execution with tool calling, approvals, pause/resume, cancellation, replay, run assessment, self-verification, memory context, retrieval augmentation, and multimodal helper methods.
- `Tool`: JSON Schema based tool definition that adapters can export to provider-specific formats.
- `Run` / `RunInspector`: inspectable run model with events, checkpoints, timings, usage, lineage, assessments, and errors.
- `DistributedRunEnvelope` / `TraceCorrelation` / `RunTreeInspector` / `IncidentDebugger` / `DistributedRecoveryPlanner` / `DistributedRecoveryRunner` / `TraceSerializer` / `TraceDiffer`: distributed handoff envelopes, correlation metadata, run trees, incident workflows, policy-aware recovery planning and execution, portable traces, and replay diffing for runtime control.
- `ExecutionIdentity`: normalized execution identity metadata for delegated and remote runtime paths.
- `Workflow` / `WorkflowStep` / `AgentWorkflowStep` / `WorkflowRunner`: dependency-aware orchestration built on the runtime.
- `DelegationRuntime` / `DelegationContract`: explicit multi-agent delegation with governed contracts and child-run tracking.
- `PlanningRuntime`: plan, verify, recover execution flow for higher-order runtime tasks.
- `Memory`: layered memory for conversation, working, profile, policy, and semantic storage.
- `RAG`: grounded retrieval helper with provenance, reranking, retrievers, Pinecone support, or the built-in `LocalVectorStore`.
- `FallbackRouter`: capability-aware provider fallback routing with cost/risk/task-type hints and optional history-aware routing advice.
- `BackgroundJobScheduler`: recurring and delayed job execution with pluggable job stores.
- `EvidenceGraph` / `EvalHarness` / `LearningLoop` / `BranchQualityAnalyzer` / `PolicyTuningAdvisor` / `VerifierEnsemble` / `ConfidencePolicy` / `AdaptiveRetryPolicy` / `HistoricalRoutingAdvisor` / `AdaptiveDecisionLedger` / `AdaptiveGovernanceGate`: runtime evidence tracking, eval execution, learning signals from runs and benchmarks, adaptive recommendation summaries, replay/branch quality comparison, policy-tuning suggestions, composed reviewer strategies, confidence-aware execution thresholds, adaptive retry/escalation control, history-aware provider routing, durable adaptive audit trails, and approval-aware review for material adaptive changes.
- `CritiqueProtocol` / `CritiqueSchemaRegistry` / `TrustRegistry` / `DisagreementResolver` / `CoordinationLoop` / `DecompositionAdvisor`: a separate coordination layer for structured critique, task-family failure taxonomies, trust-weighted coordination, explicit disagreement resolution, a simple propose -> critique -> resolve -> act loop, and task decomposition/delegation recommendations above the runtime.
- `EventBus` / `ConsoleDebugSink` / `FileAuditSink` / `WebhookEventSink` / `RuntimeEventRedactor`: structured runtime events, debug sinks, JSONL audit logging, external event forwarding, and PII-safe redaction helpers.
- `ToolPolicy` / `GovernanceHooks` / `WebhookGovernanceAdapter` / `ApprovalInbox` / `StorageBackendRegistry`: governance policy controls, external review hooks, remote control-plane forwarding, and stable runtime storage contracts.
- environment adapters for browser, shell, API, queue, and file-backed execution environments.
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

`Agent.run()` returns an inspectable `Run` object. This is the maintained path for runtime features like approvals, checkpoints, branching, replay, self-verification, and inspection.

```js
const {
  Agent,
  Tool,
  OpenAIAdapter,
  RunInspector
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
  verifier: new OpenAIAdapter(process.env.OPENAI_API_KEY, {
    model: 'gpt-4o-mini',
  }),
  defaultConfig: { selfVerify: true },
});

let run = await agent.run('Send Paulo a short update saying the runtime is ready.');

if (run.status === 'waiting_for_approval') {
  run = await agent.resumeRun(run.id, { approved: true, reason: 'approved in demo' });
}

console.log(run.output);
console.dir(RunInspector.summarize(run), { depth: null });
```

## Memory example

```js
const { Agent, Memory, OpenAIAdapter } = require('agnostic-agents');

const memory = new Memory();
const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY), {
  memory,
  description: 'You remember earlier turns and task context.',
});

memory.setWorkingMemory('current_project', 'Validate the v4 runtime-control release.');
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
  DelegationContract,
  DelegationRuntime,
  OpenAIAdapter,
} = require('agnostic-agents');

const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY);

const researcher = new Agent(adapter, {
  description: 'Produce concise factual bullet points.',
});

const writer = new Agent(adapter, {
  description: 'Turn findings into short status updates.',
});

const delegationRuntime = new DelegationRuntime();

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

const runner = new WorkflowRunner({ workflow });
const run = await runner.run('Prepare a daily sync update');
console.log(run.output);
```

## Distributed handoff example

Use a shared run store when one process creates a run and another process continues it.

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

## Planning and scheduling example

```js
const {
  PlanningRuntime,
  BackgroundJobScheduler,
  InMemoryJobStore,
} = require('agnostic-agents');

const planning = new PlanningRuntime({
  planner: async ({ input }) => [{ id: 'plan-1', task: input }],
  executor: async ({ plan }) => ({ completed: true, planLength: plan.length }),
  verifier: async ({ result }) => ({ status: result.completed ? 'passed' : 'recover' }),
});

const planningRun = await planning.run('Summarize the runtime state');
console.log(planningRun.output);

const scheduler = new BackgroundJobScheduler({
  store: new InMemoryJobStore(),
  handlers: {
    sync: async payload => ({ ok: true, topic: payload.topic }),
  },
});

await scheduler.schedule({
  id: 'nightly-sync',
  handler: 'sync',
  payload: { topic: 'runtime' },
  runAt: new Date().toISOString(),
});

const dueJobs = await scheduler.runDueJobs();
console.log(dueJobs);
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
- `npm run example:openai-v3-runtime`
- `npm run example:openai-v4-runtime`
- `npm run example:reference-worker`
- `npm run example:reference-incident`
- `npm run example:reference-operator`
- `npm run example:reference-evals`
- `npm run example:reference-replay-benchmarks`
- `npm run example:reference-v7-audit`
- `npm run example:reference-coordination-review`
- `npm run example:reference-decomposition-advisor`
- `npm run example:reference-openapi`
- `npm run example:reference-durable-backends`
- `npm run example:reference-distributed-handoff`
- `npm run example:reference-distributed-incident`
- `npm run example:reference-remote-control-plane`
- `npm run example:reference-deployment-split`
- `npm run example:reference-distributed-recovery`

Additional examples live in [`examples/`](examples).

Maintained `v1` examples are documented in [`examples/README.md`](examples/README.md).

Reference deployment patterns are documented in [`docs/reference-integrations.md`](docs/reference-integrations.md).
The maintained package reference is documented in [`docs/api-reference.md`](docs/api-reference.md).
Version-to-version upgrade paths are documented in [`docs/migration-guides.md`](docs/migration-guides.md).
The public API stability, deprecation, and versioning rules are documented in [`docs/api-stability-policy.md`](docs/api-stability-policy.md).
Copy-paste provider quickstarts are documented in [`docs/provider-quickstarts.md`](docs/provider-quickstarts.md).
Benchmarking and regression-eval guidance is documented in [`docs/benchmarking.md`](docs/benchmarking.md).
Comparison benchmark fixtures are documented in [`docs/benchmark-fixtures.md`](docs/benchmark-fixtures.md).
Plugin authoring guidance is documented in [`docs/plugin-authoring.md`](docs/plugin-authoring.md).
MCP interoperability guidance is documented in [`docs/mcp-interoperability.md`](docs/mcp-interoperability.md).
OpenAPI integration examples are documented in [`docs/openapi-examples.md`](docs/openapi-examples.md).
Real product-pattern recipes are documented in [`docs/cookbook.md`](docs/cookbook.md).
Operator triage, replay, branching, and recovery workflows are documented in [`docs/operator-workflows.md`](docs/operator-workflows.md).
Operator-facing deployment guidance is documented in [`docs/operator-architecture.md`](docs/operator-architecture.md).
Production-oriented storage backend guidance is documented in [`docs/storage-backends.md`](docs/storage-backends.md).
Distributed execution and handoff guidance is documented in [`docs/distributed-execution.md`](docs/distributed-execution.md).
Remote control-plane guidance is documented in [`docs/remote-control-planes.md`](docs/remote-control-planes.md).
Distributed identity and auth-scope guidance is documented in [`docs/distributed-identities.md`](docs/distributed-identities.md).

Secret-handling expectations for adapters, tools, logs, traces, and tests are documented in [`docs/secret-handling.md`](docs/secret-handling.md).
Tool auth propagation for host-controlled credentials is documented in [`docs/tool-auth-propagation.md`](docs/tool-auth-propagation.md).

## Current v7 scope

This package currently targets:

- provider-agnostic tool calling
- inspectable runs with checkpoints, replay, branching, run trees, traces, events, and assessments
- approval-gated, pausable, resumable, and cancellable execution
- layered memory
- grounded retrieval with provenance and evidence tracking
- workflow orchestration and explicit delegation on top of the runtime
- planning, recovery, and recurring background execution
- distributed execution, queue/service handoff, remote control-plane integration, and cross-service recovery
- provider fallback routing with cost/risk/task-type hints
- incident debugging, portable trace export, governance hooks, tool allowlist/blocklist controls, PII-safe audit logging, auth propagation for tools, operator recovery/deployment guidance, and reference deployment patterns
- maintained benchmark references for replay regressions and adaptive routing/governance decisions
- a single `v7` audit example for end-to-end adaptive-runtime verification logs
- adaptive routing, verifier composition, confidence-aware execution, adaptive retry/escalation, and approval-aware adaptive governance
- a separate in-repo coordination layer for structured critique and disagreement resolution above the runtime core
- a maintained coordination loop example that turns critiques into an executed next action
- MCP tool discovery
- eval and learning-loop primitives for runtime benchmarking

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

See [`docs/provider-compatibility.md`](docs/provider-compatibility.md) for provider-specific notes.
Certification levels and support-claim rules are defined in [`docs/provider-certification.md`](docs/provider-certification.md).
Secret handling and redaction guidance is documented in [`docs/secret-handling.md`](docs/secret-handling.md).

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

Detailed command and environment documentation is available in [`docs/testing.md`](docs/testing.md).

Package publish contents are documented in [`docs/package-audit.md`](docs/package-audit.md).

Maintained runtime demos are:

```bash
npm run example:openai-runtime
npm run example:openai-v3-runtime
npm run example:openai-v4-runtime
npm run example:reference-distributed-handoff
npm run example:reference-distributed-incident
npm run example:reference-remote-control-plane
npm run example:reference-deployment-split
npm run example:reference-distributed-recovery
```
