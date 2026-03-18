# State Incident Reconstruction

`StateIncidentReconstructor` turns a portable `StateBundle` into an offline
incident report.

Use it when you want to inspect a failed, paused, or approval-blocked run from a
portable state artifact without reconnecting to the original runtime stores.

## What it reconstructs

- run id and current status
- summarized run inspection output
- last captured failure
- failed steps
- last checkpoint boundary
- pending approval or pause state
- available memory layers
- operator-facing recommendations

## Why it matters

Portable trace export explains what happened over time.

Portable state bundles preserve what the runtime believed to be true at a
particular restore boundary. `StateIncidentReconstructor` uses that preserved
state to reduce inference during offline incident analysis.

## Maintained example

- [`examples/referenceStateIncidentReconstructor.js`](../examples/referenceStateIncidentReconstructor.js)

That example shows a failed run being wrapped into a `StateBundle` and
reconstructed into an offline incident report with recommendations.
