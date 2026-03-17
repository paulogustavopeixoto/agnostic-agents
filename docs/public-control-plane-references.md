# Public Control-Plane References

`agnostic-agents` is not a hosted control plane.

It does expose the runtime artifacts a control plane needs:

- durable run records
- approval and governance events
- run-tree inspection
- incident reports
- trace diffing
- portable trace bundles

Use these references when you want to build a thin public-facing or internal control-plane layer on top of the runtime without changing the runtime model.

## Maintained reference example

- [`examples/referencePublicControlPlane.js`](../examples/referencePublicControlPlane.js)

This example shows a minimal control-plane view that:

- loads stored runs from a durable store
- renders the root run tree
- builds an incident report for a failing delegated run
- diffs a failed run against a healthy comparison run
- exports a portable trace bundle for external tooling

## Recommended control-plane surface

Keep the control plane thin.

- runtime process
  - runs `Agent` or `WorkflowRunner`
  - persists runs, checkpoints, and events
  - emits governance callbacks and selected runtime events
- control-plane process
  - reads from the durable run store or trace bundle exports
  - renders run trees and incident summaries
  - shows approval state and replay/branch options
  - forwards approval decisions back through your API or worker layer

## Core runtime pieces

Use these maintained surfaces:

- `RunInspector`
- `RunTreeInspector`
- `IncidentDebugger`
- `TraceDiffer`
- `TraceSerializer`
- `GovernanceHooks`
- `WebhookGovernanceAdapter`
- `WebhookEventSink`

## Public payload guidance

If you expose runtime state outside your service boundary, prefer derived payloads instead of raw mutable objects.

Good public control-plane payloads:

- run summary
- rendered run tree
- incident summary and recommendations
- trace diff summary
- exported trace bundle metadata

Less ideal payloads:

- raw in-memory runtime instances
- ad hoc event arrays without run identity or lineage
- partially redacted objects that no longer match the maintained trace schema

## Related docs

- [Reference integrations](reference-integrations.md)
- [Remote control planes](remote-control-planes.md)
- [Operator workflows](operator-workflows.md)
- [Run and trace visualization](run-trace-visualization.md)
