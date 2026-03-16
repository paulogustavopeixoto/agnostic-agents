# Migration: v1 to v2

Use this guide when moving from the earlier toolkit-style package to the `v2` runtime-backed model.

## What changed

`v2` was the shift from:

- basic agent/tool usage

to:

- runtime-backed execution with `Run`
- checkpoints and structured events
- pause/resume/cancel flows
- approval-gated execution
- maintained workflow primitives

## Main migration changes

### Prefer `Agent.run()` over plain `sendMessage()` for serious flows

Before:

- `sendMessage()` was enough for most usage

After:

- `sendMessage()` still works for simple message loops
- `run()` is the maintained path when you need inspection, approvals, or recovery

Move to:

- `const run = await agent.run(input)`

### Start treating execution as a durable runtime record

New maintained surfaces:

- `Run`
- `RunInspector`
- `InMemoryRunStore` / `FileRunStore`

Adopt these when:

- you need status tracking
- you need replay or branching later
- you need approval or pause handling

### Move orchestration to the runtime-backed workflow layer

Compatibility exports:

- `Task`
- `Orchestrator`

Maintained path:

- `Workflow`
- `WorkflowStep`
- `AgentWorkflowStep`
- `WorkflowRunner`

If you still have orchestration logic around the legacy layer, plan to move it.

### Normalize tool governance metadata

Tools should start declaring runtime-relevant metadata such as:

- `sideEffectLevel`
- `executionPolicy`
- `verificationPolicy`

That gives the runtime enough structure to make approval and inspection meaningful.

## Minimal upgrade checklist

- keep simple message-only usage on `sendMessage()` if you want
- move any side-effecting or inspectable flows to `run()`
- add a run store if you need durable inspection
- migrate orchestration to `Workflow` / `WorkflowRunner`
- enrich tools with governance metadata

## Before / after mental model

Before:

- the package is mostly a provider/tool abstraction

After:

- the package is a runtime with runs, checkpoints, approvals, and orchestration

## Good first step

If you only make one change during this migration, make it this:

- move important executions from `sendMessage()` to `run()` and inspect them with `RunInspector`
