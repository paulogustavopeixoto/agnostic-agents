# Policy Approval and Escalation Simulation

This document describes the maintained pre-rollout simulation surface for
approval and escalation policy behavior in `v9 Policy OS`.

The goal is to test approval-gated runtime actions and escalation-gated
coordination outcomes before those policies are promoted into active use.

## Maintained surface

- `ApprovalEscalationPolicySuite`

Use it when you want to:

- simulate whether a tool request would require approval before rollout
- simulate whether a coordination action would be escalated by policy
- run both as maintained eval scenarios through one report

## What it composes

- `PolicySimulator` for approval-oriented runtime tool policy scenarios
- `CoordinationPolicyGate` for escalation-oriented coordination policy scenarios
- `EvalHarness` for maintained pass/fail reporting

## Maintained example

- [`examples/referenceApprovalEscalationPolicySuite.js`](../examples/referenceApprovalEscalationPolicySuite.js)

That example shows:

- a protected tool scenario that should require approval
- a policy-heavy `branch_and_retry` coordination resolution that should be escalated
- one maintained report for both paths before rollout
