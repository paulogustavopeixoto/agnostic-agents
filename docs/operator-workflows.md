# Operator Workflows

This guide describes the maintained operator workflows for `agnostic-agents`.

Use it when you need to:

- inspect a failed or paused run
- compare two run outcomes
- prepare a branch or replay from a checkpoint
- export traces for offline analysis
- recover from common runtime failure modes

These workflows assume you are using the maintained runtime surfaces:

- `RunInspector`
- `RunTreeInspector`
- `IncidentDebugger`
- `TraceCorrelation`
- `TraceDiffer`
- `TraceSerializer`

## 1. Triage a failed or paused run

Start with the run summary.

Use:

- `RunInspector.summarize(run)`

Check:

- `status`
- `errors`
- `pendingApproval`
- `pendingPause`
- `checkpoints`
- `childRunAggregate`

Operator question:

- did the run fail, pause for approval, or pause for branch/replay preparation?

## 2. Inspect the run tree

When the run belongs to a workflow or delegated execution path, inspect the full tree.

Use:

- `RunTreeInspector.getTree(runId)`
- `RunTreeInspector.render(tree)`

Check:

- root run id
- parent/child relationships
- which child run failed
- whether failure was isolated or propagated

Operator question:

- is the problem in the root workflow, a delegated child, or a branch created during incident handling?

## 3. Build an incident report

For serious incidents, generate a structured report instead of reading raw run JSON.

Use:

- `IncidentDebugger.createReport(runId, { compareToRunId })`

Check:

- `failure`
- `failedSteps`
- `lastCheckpoint`
- `renderedRunTree`
- `comparison`
- `recommendations`

Operator question:

- what failed, where did it fail, and what is the next safe recovery action?

## 4. Compare runs or branches

When behavior changed across retries, branches, or releases, diff the traces.

Use:

- `TraceDiffer.diff(leftRun, rightRun)`

Check:

- status changes
- output changes
- event-type additions/removals
- first diverging step or event

Operator question:

- did the run diverge in model behavior, policy behavior, tool behavior, or workflow structure?

## 5. Prepare a replay or branch

Use replay or branching when you want to recover safely without mutating the original record.

Use:

- full frozen replay for deterministic inspection
- partial replay from a checkpoint when you want to resume analysis from a known state
- checkpoint branching when you want an alternate path without touching the source run

Checkpoint guidance:

- branch from the last safe checkpoint before a failing tool or verifier stage
- prefer the checkpoint after approval resolution when the incident is downstream of governance
- prefer the checkpoint before tool execution when the incident is tied to external side effects

Operator question:

- do I need a deterministic replay, or do I need an alternate branch to test a recovery path?

## 6. Export traces for offline analysis

When runs need to leave the live system boundary, export traces instead of copying internal objects.

Use:

- `TraceSerializer.exportRun(run)`
- `TraceSerializer.exportPartialRun(run, { checkpointId })`
- `TraceSerializer.exportBundle(runs, metadata)`

Use this for:

- handoff to a control plane UI
- support/debug attachments
- benchmark fixture capture
- post-incident review

## Common recovery playbooks

### Approval-gated run paused

Symptoms:

- `status: paused`
- `pendingApproval` present

Action:

- inspect approval payload
- resolve approval externally or through the inbox
- resume the run only after the decision is recorded

### Side-effecting tool failed

Symptoms:

- `tool_failed` event
- failed tool step
- external write or destructive side effect metadata

Action:

- confirm whether the external side effect partially happened
- branch or partially replay from the checkpoint before tool execution
- avoid blindly replaying a destructive step

### Verifier or planning failure

Symptoms:

- failed planning or verification checkpoint
- no external tool effect yet

Action:

- use the incident report to inspect the failed step
- replay from the failed planning/verification checkpoint if the state is still valid
- compare to a successful run if available

### Workflow child-run failure

Symptoms:

- workflow root completed or failed with child failures
- child run tree shows one failing delegated run

Action:

- inspect the failing child run directly
- diff it against a healthy child run if one exists
- only replay the affected branch unless the root orchestration also diverged

### Queue handoff failure

Symptoms:

- a queued continuation never reaches `replay_completed` or `workflow_replay_completed`
- queue metadata is present but the worker run is missing
- incident report shows a failed remote continuation after the handoff

Action:

- verify the source run and checkpoint were persisted before the envelope was queued
- inspect correlation metadata such as `traceId`, `spanId`, `queue`, and `workerId`
- replay from the same checkpoint only after confirming the original queue message was not partially consumed twice
- export a bundle with both source and worker runs before mutating queue state

### Service-to-service continuation failure

Symptoms:

- the receiving service cannot continue the envelope
- lineage exists but the remote service cannot resolve the run or checkpoint
- run tree shows the source run without the expected remote continuation

Action:

- verify the receiving service has access to the same durable `runStore`
- confirm the envelope `runtimeKind`, `action`, and `checkpointId` match the target runtime
- compare envelope correlation metadata against the remote run metadata
- branch from the persisted checkpoint if the original remote continuation path is no longer trustworthy

## Operator defaults

Use these defaults unless you have a strong reason not to:

- generate an incident report first
- inspect the run tree second
- diff against a known-good run when possible
- branch before retrying risky steps
- export a portable trace bundle for any serious incident

## Maintained operator example

See [`examples/referenceOperatorWorkflow.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/referenceOperatorWorkflow.js) for a runnable reference that demonstrates:

- tree inspection
- incident reporting
- trace diffing
- partial trace export

For cross-service and queue-native incident reconstruction, see [`examples/referenceDistributedIncident.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/referenceDistributedIncident.js).
