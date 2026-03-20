# Autonomy Config Drift

This guide covers the next maintained `v20 Enterprise Autonomy OS` slice.

The baseline surfaces are:

- `AutonomyStackConfig`
- `AutonomyStackComparator`
- `AutonomyDriftGuard`

They make it possible to compare autonomy stacks across environments and block unsafe drift before rollout.

## What This Adds

- a portable config artifact for routing, policy, memory, autonomy, fleet, and operator settings
- structured comparison across autonomy stacks
- drift controls that can block deploys when sensitive sections change

## Maintained Reference Example

See:

- [`examples/referenceAutonomyConfigDrift.js`](../examples/referenceAutonomyConfigDrift.js)

That example shows:

- one baseline autonomy stack
- one candidate autonomy stack
- one structured diff
- one blocked deployment because policy drift is not allowed
