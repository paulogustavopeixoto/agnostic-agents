![NPM Version](https://img.shields.io/npm/v/agnostic-agents) ![NPM Downloads](https://img.shields.io/npm/dy/agnostic-agents)

# agnostic-agents

`agnostic-agents` is a Node.js runtime OS for building provider-agnostic agent systems.
The longer direction is broader than provider agnosticism alone: the package is
meant to stay agnostic to how intelligence is produced, whether that comes from
an LLM, tool, workflow, simulator, verifier, or human checkpoint.

It is designed for projects that need more than a chat wrapper:

- inspectable runs
- checkpoints and replay
- approvals and policy-gated tools
- workflows and delegation
- grounded retrieval and layered memory
- governed memory with provenance, retention, conflict handling, and access controls
- distributed handoff across processes or services
- evals, benchmarks, and incident analysis
- API and protocol tools imported from OpenAPI, curl, and MCP discovery
- import, sandbox, record, and simulate external tools before production use

The package also includes a separate coordination layer above the runtime for:

- structured critique
- disagreement resolution
- task decomposition
- coordination benchmarks

It also includes governed learning, fleet rollout, and assurance surfaces for:

- reviewed improvement proposals and bounded adaptation
- staged rollout and canary control across many runtimes
- invariant checks and rollout blocking before unsafe changes spread

The maintained architecture is:

- runtime OS first
- coordination intelligence above the runtime
- governed learning above coordination
- fleet and assurance layers above runtime, coordination, and learning
- operator control above those layers
- next-horizon capability routing, governed memory, and budgeted autonomy on top of the current core

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
- a package that can turn evidence into governed improvement proposals instead of hidden self-modification
- a package that can keep learned changes inside explicit safety envelopes and measure their effect after review
- a package that can turn eval, incident, and branch evidence into concrete runtime or coordination change plans
- a package that can benchmark learned changes and halt adaptation when those changes start regressing outcomes
- a package that can stage, compare, and roll back changes across a fleet of runtimes
- a package that can block unsafe rollout candidates with explicit invariants and assurance reports
- a package that can evolve toward capability-aware routing instead of static model/provider defaults
- a package that treats memory as governed operational knowledge instead of ad hoc retrieval glue
- a package that can audit what memory was stored, recalled, blocked, expired, or superseded
- a package that treats supervised autonomy as a core operating model rather than an exception path
- a package that can turn OpenAPI files, curl commands, and MCP discovery into governed executable tools
- a package that can bootstrap tools from Postman collections, record real tool I/O, mock them offline, and resolve secrets outside prompts and code

Do not think of it as only a prompt helper or a chat abstraction. The maintained direction is a runtime control layer for serious agent systems.

The repo is intentionally split so that:

- runtime primitives stay general-purpose and portable
- coordination logic stays inspectable and separate from the runtime kernel
- learning/adaptation remains governed instead of hidden in opaque agent glue
- fleet rollout and assurance remain operator-visible instead of collapsing into opaque control-plane logic

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

### API and MCP Tool Import

The maintained import surfaces are:

- `OpenAPILoader`
- `ApiLoader`
- `CurlLoader`
- `PostmanLoader`
- `MCPDiscoveryLoader`

Use them when you want to:

- turn an OpenAPI file into executable runtime tools
- normalize a custom API spec into runtime tools
- bootstrap a tool from a working curl command
- bootstrap tools from Postman collections and variables
- discover remote MCP tools and expose them through the normal tool/runtime path

The maintained utility surfaces above the runtime also include:

- `SecretResolver`
- `SchemaNormalizer`
- `ToolRecorder`
- `ToolMockBuilder`
- `ToolSandboxRunner`
- `PromptArtifact`
- `PromptRegistry`
- `RunRecipe`
- `WorkflowPreset`
- `IncidentBundleExporter`
- `CredentialDelegationKit`
- `RoutePolicySimulator`

The first maintained memory-governance surfaces now include:

- `MemoryProvenanceLedger`
- `MemoryRetentionPolicy`
- `MemoryAccessController`
- `MemoryConflictResolver`
- `MemoryAuditView`
- `MemoryGovernanceBenchmarkSuite`
- `MemoryGovernanceDiagnostics`
- `MemoryGovernanceReviewWorkflow`

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
- risk-class and artifact-type-aware critique defaults through `CritiqueSchemaRegistry`
- `TrustRegistry`
- `DisagreementResolver`
- `CoordinationLoop`
- `DecompositionAdvisor`
- `CoordinationBenchmarkSuite`
- `CoordinationRoleContract`
- `RoleAwareCoordinationPlanner`
- `CoordinationTrace`
- `DisagreementResolver` strategies for weighted, majority, trust-consensus, and severity-first coordination
- `VerificationStrategySelector`
- `MultiPassVerificationEngine`
- `CoordinationQualityTracker`
- `CoordinationDiagnostics`

This layer is for:

- structured critique records
- trust-weighted disagreement handling
- role-aware decomposition and assignment
- disagreement strategies shaped by trust, severity, and consensus mode
- multi-pass and adversarial verification paths for higher-risk coordination
- verifier quality tracked separately from executor quality
- operator-facing coordination diagnostics for disagreement, missing roles, and verification escalation
- coordination evals and benchmarks

It is intentionally separate from the runtime kernel.

## Forward Direction

The current package already includes:

- `v9` Policy OS core
- `v10` State OS core
- `v11` Interop OS core
- `v12` Coordination OS core
- `v13` Learning OS core
- `v14` Fleet OS core
- `v15` Assurance OS baseline

The maintained direction after this is refinement and extension of those layers:

- interop depth and external ecosystem adoption
- stronger coordination quality and diagnostics
- governed learning refinement instead of hidden autonomy
- stronger fleet and assurance hardening above the completed core

The next horizon after the current shipped core is:

- `v16` Operator OS
  - richer day-2 control, intervention, triage, and governance continuity

That sequence is intentional.
The package should become smarter without collapsing policy, state, interop, coordination, and learning into one opaque layer.

The current maintained `v14` baseline starts with:

- `FleetRolloutPlan`
- `FleetHealthMonitor`
- `FleetCanaryEvaluator`
- `FleetSafetyController`
- `FleetImpactComparator`
- `FleetRollbackAdvisor`
- `RouteFleetDiagnostics`

The current maintained `v15` baseline starts with:

- `InvariantRegistry`
- `AssuranceSuite`
- `AssuranceReport`
- `AssuranceGuardrail`
- `AssuranceRecoveryPlanner`
- `FleetSafetyController`
- `FleetImpactComparator`
- `FleetRollbackAdvisor`

The current `v16` baseline starts with:

- `OperatorSummary`
- `OperatorInterventionPlanner`
- `OperatorTriageWorkflow`
- `GovernanceRecordLedger`
- `AuditStitcher`
- `GovernanceTimeline`
- `OperatorDashboardSnapshot`
- `OperatorControlLoop`

Useful docs for these layers:

- [Governed improvement](docs/governed-improvement.md)
- [Fleet OS](docs/fleet-os.md)
- [Assurance OS](docs/assurance-os.md)
- [Operator day-2 guidance](docs/operator-day2.md)
- [Operator checklists](docs/operator-checklists.md)
- [Operator OS](docs/operator-os.md)

### Policy and Governance

Use:

- `ToolPolicy` for raw policy logic
- `PolicyPack` for portable policy artifacts
- `PolicySimulator` for policy simulation over requests, runs, and trace bundles
- `PolicyEvaluationRecord` for portable policy evaluation artifacts
- `PolicyDecisionReport.explain()` for operator-facing policy explanations
- `PolicyScopeResolver` for scoped policy inheritance across runtime, workflow, agent, and distributed handoff layers
- `PolicyLifecycleManager` for draft promotion and rollback of policy packs
- `ApprovalEscalationPolicySuite` for simulating approval and escalation policy scenarios before rollout
- `RecoveryPolicyGate` for applying policy constraints to replay, branch, and resume recovery paths
- `CompensationPolicyPlanner` for applying policy to compensation recommendations on side-effecting work
- `CoordinationPolicyGate` for applying policy to coordination outcomes like retry, reject, or escalate
- `ExtensionHost` for contributed policy and governance behavior
- `ProductionPolicyPack` for a maintained production-oriented preset
- `ApprovalInbox` and `GovernanceHooks` for operator-facing control
- `AutonomyBudget` for one explicit budget surface across spend, retries, tool calls, wall-clock runtime, external actions, and tokens
- `UncertaintySupervisionPolicy` for shifting execution into review, escalation, or safer fallback when confidence drops
- `ApprovalDelegationContract` for reusable human approval and delegation boundaries on repeated operational actions
- `AutonomyEnvelope` for a combined autonomy decision that merges budget pressure with supervision thresholds
- `AutonomyPolicyRegistry` for tenant-, jurisdiction-, and environment-scoped autonomy rules around tool access, review requirements, and data-handling constraints
- `InterventionPolicyRegistry` for operator-defined intervention policies by task family, risk class, and environment
- `ApprovalDecisionCache` for reusable approval caching and revocation with audit-friendly summaries
- `WorkflowSupervisionCheckpoint` for workflow review gates that surface rationale, alternatives, confidence, and task/risk context before execution continues
- `ProgressiveAutonomyController` for widening or tightening autonomy envelopes by evidence, tenant, and environment
- `AutonomyBenchmarkSuite` for maintained eval coverage of budget exhaustion, approval latency, escalation quality, and supervised-autonomy behavior
- `AutonomyFleetSummary` for fleet summaries of autonomy budget usage and escalation hot spots
- `AutonomyRolloutGuard` for blocking rollout when autonomy-envelope widening lacks evidence or benchmark support

### State and Replay

Use:

- `Run` for inspectable runtime state
- `TraceSerializer` for portable run/trace export
- `StateBundle` for portable run-plus-memory state snapshots
- `StateDiff` for high-level state comparison
- `StateBundleSerializer` for import/export and validation of state bundles
- `StateContractRegistry` for authoritative-versus-derived state contracts
- `StateIntegrityChecker` for pre-restore integrity checks
- `StateConsistencyChecker` for coherence checks across run state, memory, and portable job metadata
- `MemoryAccessContractRegistry` for explicit memory access contracts across runtime, workflow, coordination, learning, and operator surfaces
- `StateRestorePlanner` for cross-environment restore planning from portable state bundles
- `StateDurableRestoreSuite` for process, queue, and service restore scenarios plus workflow/scheduler durability steps
- `StateIncidentReconstructor` for offline incident reconstruction directly from portable state bundles

This means users can add or mutate policy dynamically without patching core runtime code.

Useful docs for these surfaces:

- [Policy OS](docs/policy-os.md)
- [State OS](docs/state-os.md)
- [State restore](docs/state-restore.md)
- [State durable restore](docs/state-durable-restore.md)
- [State incident reconstruction](docs/state-incident-reconstruction.md)

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
- `npm run example:reference-operator-dashboard`
- `npm run example:reference-evals`
- `npm run example:reference-replay-benchmarks`
- `npm run example:reference-adaptive-benchmarks`
- `npm run example:reference-v7-audit`
- `npm run example:reference-coordination-review`
- `npm run example:reference-decomposition-advisor`
- `npm run example:reference-coordination-benchmarks`
- `npm run example:reference-coordination-policy-gate`
- `npm run example:reference-role-aware-coordination`
- `npm run example:reference-production-policy-pack`
- `npm run example:reference-policy-simulation`
- `npm run example:reference-policy-inheritance`
- `npm run example:reference-policy-lifecycle`
- `npm run example:reference-approval-escalation-policy-suite`
- `npm run example:reference-recovery-policy-gate`
- `npm run example:reference-compensation-policy-planner`
- `npm run example:reference-state-bundle`
- `npm run example:reference-state-restore-planner`
- `npm run example:reference-state-incident-reconstructor`
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
5. run `reference-public-control-plane`
6. review [docs/operator-workflows.md](docs/operator-workflows.md)

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
- [Operator day-2 guidance](docs/operator-day2.md)
- [Operator checklists](docs/operator-checklists.md)
- [Operator OS](docs/operator-os.md)
- [Governed improvement](docs/governed-improvement.md)
- [Fleet OS](docs/fleet-os.md)
- [Assurance OS](docs/assurance-os.md)
- [Multi-runtime operations](docs/multi-runtime-operations.md)
- [Public control-plane references](docs/public-control-plane-references.md)
- [Run and trace visualization](docs/run-trace-visualization.md)
- [Distributed execution](docs/distributed-execution.md)
- [Remote control planes](docs/remote-control-planes.md)
- [Distributed identities](docs/distributed-identities.md)
- [Storage backends](docs/storage-backends.md)

Policy, governance, and security:

- [Policy and governance packs](docs/policy-governance-packs.md)
- [Role-aware coordination](docs/role-aware-coordination.md)
- [Secret handling](docs/secret-handling.md)
- [Tool auth propagation](docs/tool-auth-propagation.md)

Evals and ecosystem:

- [Benchmarking](docs/benchmarking.md)
- [Benchmark fixtures](docs/benchmark-fixtures.md)
- [Autonomy policies](docs/autonomy-policies.md)
- [Autonomy operations](docs/autonomy-operations.md)
- [Budgeted autonomy](docs/budgeted-autonomy.md)
- [Progressive autonomy](docs/progressive-autonomy.md)
- [Capability fabric](docs/capability-fabric.md)
- [Community summaries](docs/community-summaries.md)
- [Community roadmap status](docs/community-roadmap-status.md)
- [Plugin authoring](docs/plugin-authoring.md)
- [Extension certification and compatibility](docs/extension-certification.md)
- [Ecosystem certification guidance](docs/ecosystem-certification.md)
- [Runtime extension contributor guidance](docs/runtime-extension-contributors.md)
- [Interop OS](docs/interop-os.md)
- [Interop artifact registry](docs/interop-artifact-registry.md)
- [Interop schema evolution](docs/interop-schema-evolution.md)
- [Interop contract validation](docs/interop-contract-validation.md)
- [Interop certification kits](docs/interop-certification-kits.md)
- [Third-party control plane interop](docs/interop-control-planes.md)
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
- governed learning and bounded adaptation
- fleet rollout and rollback control
- assurance suites and rollout guardrails
- operator-centered triage and intervention workflows
- operator dashboard snapshots and control-loop references

## Forward Direction

The current package already covers the runtime, coordination, governed
learning, fleet, assurance, and operator core program through `v16`.

The next horizon is not "add basic runtime features."
That substrate already exists.
The next versions are about turning that substrate into a stronger autonomy
operating layer:

- `v17` Capability Fabric OS
  - capability-aware routing across models, tools, methods, simulators, verifiers, budgets, and trust zones
- `v18` Memory Governance OS
  - governed memory with provenance, retention, redaction, conflict handling, and operator-visible lifecycle rules
- `v19` Budgeted Autonomy OS
  - uncertainty thresholds, reusable human approvals, jurisdiction/tenant-aware policies, and explicit autonomy budgets
- `v20` Enterprise Autonomy OS
  - integrated execution graphs, transactional side-effect discipline, multi-agent safety controls, and a coherent AI operating-layer story

The target shape is six layers:

- kernel
- policy
- workflow
- intelligence
- memory
- operator

The governing rule stays the same:

- reliability over demo complexity
- observability over abstraction hype
- supervised autonomy over blind automation
- governed memory over ad hoc retrieval
- policy and evaluation over hidden self-modification

The first maintained `v17` surface is `CapabilityRouter`, which adds
explainable capability-aware ranking above raw provider fallback.
That routing surface now also plugs into decomposition, role-aware coordination,
and verification strategy selection.

It does not try to be:

- a hosted control plane
- a closed worker-management product
- a provider-specific framework disguised as a generic runtime

And it should not become:

- a runtime that hides coordination and learning decisions behind unreadable internal heuristics
- a self-modifying agent loop that bypasses policy, replay, or operator review
