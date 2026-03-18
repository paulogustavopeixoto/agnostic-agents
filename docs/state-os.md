# State OS

This document describes the first maintained `v10` state surfaces in
`agnostic-agents`.

The goal is to make runtime state more portable and comparable beyond plain
trace export.

## First maintained slice

The first `State OS` slice includes:

- `StateBundle`
- `StateDiff`
- `StateBundleSerializer`
- `StateContractRegistry`
- `StateIntegrityChecker`
- `StateConsistencyChecker`
- `StateRestorePlanner`
- `StateDurableRestoreSuite`
- `StateIncidentReconstructor`

These build on top of:

- `Run`
- run checkpoints
- `TraceSerializer`

## What these surfaces are for

### `StateBundle`

Use `StateBundle` when you want:

- a portable snapshot of run state plus selected memory layers
- a stable artifact for restoration-oriented tooling
- one object that summarizes state shape, not just event history

### `StateDiff`

Use `StateDiff` when you want to:

- compare two state bundles at a high level
- detect status changes, newly added state keys, and memory-layer drift

### `StateBundleSerializer`

Use `StateBundleSerializer` when you want to:

- export/import state bundles
- validate the maintained portable state-bundle format

### `StateContractRegistry`

Use `StateContractRegistry` when you want to:

- describe which state fields are authoritative versus derived
- make restore-critical fields explicit instead of implicit

### `StateIntegrityChecker`

Use `StateIntegrityChecker` when you want to:

- validate bundle integrity before restore
- detect mismatches between authoritative state and derived summary fields
- catch basic restoration blockers before replay or import

### `StateConsistencyChecker`

Use `StateConsistencyChecker` when you want to:

- validate coherence between run state and memory layers
- verify that portable job metadata still matches job references captured on the run
- catch restore-adjacent drift that is not a schema or integrity failure

### `StateRestorePlanner`

Use `StateRestorePlanner` when you want to:

- turn a portable state bundle into a cross-environment restore checklist
- make replay/resume expectations explicit after restore
- document restore prerequisites in executable form

### `StateDurableRestoreSuite`

Use `StateDurableRestoreSuite` when you want to:

- compare restore readiness across process, queue, and service boundaries
- add workflow and scheduler durability steps on top of the base restore plan
- keep long-running restore scenarios inspectable instead of burying them in deployment glue

### `StateIncidentReconstructor`

Use `StateIncidentReconstructor` when you want to:

- reconstruct a portable offline incident report from a state bundle
- extract the last failure, failed steps, and checkpoint boundary without a live store
- turn restored memory layers and paused/approval state into operator-facing recommendations

## Maintained example

- [`examples/referenceStateBundle.js`](../examples/referenceStateBundle.js)

That example shows:

- exporting a portable state bundle from a completed run
- restoring it through the serializer
- inspecting the authoritative-versus-derived state contract
- checking integrity before restore
- checking consistency between run state, memory, and portable job metadata
- diffing it against a drifted state variant

Cross-environment restore guidance:

- [`docs/state-restore.md`](./state-restore.md)
- [`examples/referenceStateRestorePlanner.js`](../examples/referenceStateRestorePlanner.js)
- [`docs/state-durable-restore.md`](./state-durable-restore.md)

Offline incident reconstruction guidance:

- [`docs/state-incident-reconstruction.md`](./state-incident-reconstruction.md)
- [`examples/referenceStateIncidentReconstructor.js`](../examples/referenceStateIncidentReconstructor.js)
