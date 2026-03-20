# Outcome OS

`v23 Outcome OS` starts by making objectives and optimization targets explicit,
instead of inferring success only from technical pass/fail signals.

The maintained baseline for that is:

- `WorkflowOutcomeContract`
- `OutcomeScorecard`
- `GovernedOutcomeOptimizationLoop`

## What these surfaces do

### `WorkflowOutcomeContract`

Use it when you want to:

- declare objectives, acceptance criteria, and operator review points
- make workflow success criteria portable and inspectable

### `OutcomeScorecard`

Use it when you want to:

- combine operational reliability with business and service outcome signals
- evaluate outcomes without dropping the existing runtime/governance perspective

### `GovernedOutcomeOptimizationLoop`

Use it when you want to:

- tie governed improvement planning to declared outcome contracts
- keep optimization bounded by explicit contract evaluation instead of opaque heuristics

## Maintained example

- [`examples/referenceOutcomeContracts.js`](../examples/referenceOutcomeContracts.js)
