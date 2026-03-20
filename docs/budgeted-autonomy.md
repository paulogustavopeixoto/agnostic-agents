# Budgeted Autonomy

This guide covers the first maintained `v19 Budgeted Autonomy OS` slice.

The baseline surfaces are:

- `AutonomyBudget`
- `AutonomyBudgetLedger`
- `UncertaintySupervisionPolicy`
- `ApprovalDelegationContract`
- `AutonomyEnvelope`

They are meant to make autonomy boundaries explicit and inspectable rather than relying on scattered approval hooks.

## What This Adds

- one budget surface for spend, retries, tool calls, wall-clock, external actions, and token use
- uncertainty thresholds that shift execution into review or escalation
- reusable approval/delegation contracts for repeated operational actions
- one autonomy-envelope decision that combines budget and supervision pressure

## Maintained Reference Example

See:

- [`examples/referenceBudgetedAutonomy.js`](../examples/referenceBudgetedAutonomy.js)

That example shows:

- budget consumption across multiple decisions
- confidence-driven review and escalation behavior
- reusable approval delegation for repeated production actions
- a budget ledger that records envelope decisions
