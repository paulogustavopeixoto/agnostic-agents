# Autonomy Operations

This guide covers the remaining maintained `v19 Budgeted Autonomy OS` operations slice.

The baseline surfaces are:

- `AutonomyBenchmarkSuite`
- `AutonomyFleetSummary`
- `AutonomyRolloutGuard`

They turn budgeted autonomy into something measurable and rollout-safe.

## What This Adds

- eval coverage for budget exhaustion, approval latency, escalation quality, and supervised-autonomy behavior
- fleet summaries for autonomy budget usage and escalation hot spots
- rollout safeguards that block autonomy-envelope widening when evidence or benchmarks are insufficient

## Maintained Reference Example

See:

- [`examples/referenceAutonomyOperations.js`](../examples/referenceAutonomyOperations.js)

That example shows:

- one autonomy benchmark report
- one fleet summary with escalation hot spots
- one blocked rollout for unsafe autonomy widening
