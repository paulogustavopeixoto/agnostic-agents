# Migration: v3 to v4

Use this guide when moving from the `v3` runtime-OS core to the `v4` runtime-control baseline.

## What changed

`v4` extended the package from:

- a strong runtime-OS core

to:

- a stronger operator-control and portability layer

The shift is mainly about:

- better inspection
- better incident analysis
- better governance integration
- better extension/storage portability

## Main migration changes

### Treat run trees as first-class

New maintained surfaces:

- `RunTreeInspector`
- `childRunAggregate` in summaries

Use these when:

- workflows or delegation create many related runs
- you need operator-facing lineage views

### Adopt diffing and partial replay for incident work

New maintained surfaces:

- `TraceDiffer`
- `TraceSerializer.exportPartialRun(...)`
- partial `replayRun(..., { checkpointId })`

Use these when:

- you compare healthy vs failed runs
- you need replay from a specific checkpoint
- you want safer recovery paths than full rerun

### Move serious incident handling to `IncidentDebugger`

New maintained surface:

- `IncidentDebugger`

Use it when:

- operators should get structured incident reports
- you want recommendations, failed-step summaries, run tree rendering, and comparison output in one place

### Externalize governance and extension points

New maintained surfaces:

- `GovernanceHooks`
- `ExtensionHost`
- `StorageBackendRegistry`

Use these when:

- approvals and policy decisions should integrate with an external control plane
- event sinks, policy rules, and adapters should be extended without patching core runtime code
- runtime backends need named portability instead of direct wiring everywhere

### Adopt portable trace workflows

Use:

- `TraceSerializer.exportBundle(...)`

When:

- traces need to be handed to external tooling
- incident bundles need to survive process or environment boundaries

## Minimal upgrade checklist

- keep `v3` runtime surfaces already in use
- add `RunTreeInspector` for multi-run inspection
- add `TraceDiffer` and partial replay for incident workflows
- move operator incident handling to `IncidentDebugger`
- wire `GovernanceHooks` or `ExtensionHost` if external control-plane integration matters
- use portable trace bundles for offline or external debugging

## Before / after mental model

Before:

- the runtime can execute and recover well

After:

- the runtime can also support serious operator control, incident reconstruction, portability, and extension at the systems boundary

## Good first step

If you only make one change during this migration, make it this:

- add `IncidentDebugger` plus `RunTreeInspector` to your control-plane or operations workflow so incidents are handled from structured runtime artifacts instead of ad hoc logs
