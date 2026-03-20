# Progressive Autonomy

This guide covers the next maintained `v19 Budgeted Autonomy OS` slice.

The baseline surfaces are:

- `WorkflowSupervisionCheckpoint`
- `ProgressiveAutonomyController`

They extend the autonomy layer with explicit workflow review checkpoints and evidence-based widening or tightening of autonomy envelopes.

## What This Adds

- workflow checkpoints that surface rationale, alternatives, confidence, and task/risk context before risky work continues
- progressive autonomy controls that widen or tighten budget and supervision thresholds by evidence, tenant, and environment

## Maintained Reference Example

See:

- [`examples/referenceProgressiveAutonomy.js`](../examples/referenceProgressiveAutonomy.js)

That example shows:

- a workflow step that pauses into a supervised checkpoint
- a widened autonomy envelope after strong evidence
- a tightened autonomy envelope after regressions
