# Cookbook

This cookbook collects real product patterns for `agnostic-agents`.

The goal is to show how the runtime can be embedded into useful open-source application shapes without turning the package into a product-specific framework.

## 1. Approval-gated outbound updates

Use when:

- the agent may send external messages
- an operator should approve side effects first

Core pieces:

- `Tool` with `executionPolicy: 'require_approval'`
- `ApprovalInbox`
- `ToolPolicy`
- `Agent.run()`

Recommended pattern:

- model drafts the action
- runtime pauses for approval
- host resolves approval
- run resumes and records the final result

## 2. Retrieval-backed support assistant

Use when:

- the system answers from a known corpus
- grounding matters more than creativity

Core pieces:

- `RAG`
- `LocalVectorStore` or external vector store
- `EvidenceGraph`
- `RunInspector`

Recommended pattern:

- index trusted support or product docs
- retrieve context into the prompt
- inspect runs for grounding and conflicts

## 3. Multi-agent research and drafting workflow

Use when:

- one agent gathers facts
- another agent turns them into user-facing output

Core pieces:

- `Workflow`
- `AgentWorkflowStep`
- `WorkflowRunner`
- `DelegationRuntime`
- `DelegationContract`

Recommended pattern:

- keep delegation explicit
- keep child runs inspectable
- use run trees for debugging handoff failures

## 4. Scheduled internal syncs

Use when:

- a task should run daily or periodically
- you need persistence and inspection

Core pieces:

- `BackgroundJobScheduler`
- `PlanningRuntime`
- `FileJobStore` or durable job store
- `FileRunStore` or durable run store

Recommended pattern:

- persist both jobs and runs
- treat recurring work like any other inspectable runtime path

## 5. Operator incident workflow

Use when:

- a production or staging run failed
- an operator needs structured recovery steps

Core pieces:

- `IncidentDebugger`
- `RunTreeInspector`
- `TraceDiffer`
- `TraceSerializer`

Recommended pattern:

- build incident report first
- inspect run tree second
- diff against a healthy run if available
- branch or replay from a safe checkpoint

## 6. Host-controlled auth tools

Use when:

- tools need credentials
- the model must not see those credentials directly

Core pieces:

- `metadata.authRequirements`
- `authContext` or `resolveToolAuth`
- `ToolPolicy`

Recommended pattern:

- declare explicit auth requirements
- resolve bindings from host config
- fail closed when auth is missing

## 7. Extension-based deployment customization

Use when:

- you want environment-specific policy and telemetry
- you want to keep core runtime logic clean

Core pieces:

- `ExtensionHost`
- event sinks
- governance hooks
- policy rules
- eval scenarios

Recommended pattern:

- keep extensions additive and explicit
- use them for integration boundaries, not hidden core behavior changes

## How to use this cookbook

Start from the smallest matching pattern above, then combine only the runtime surfaces you actually need.

That keeps your application:

- easier to debug
- easier to govern
- less coupled to provider or product-specific assumptions
