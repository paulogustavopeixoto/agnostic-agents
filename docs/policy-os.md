# Policy OS

This document describes the first maintained `v9` policy surfaces in
`agnostic-agents`.

The goal is to make policy more portable and inspectable instead of leaving it
hidden in runtime glue code.

## First maintained slice

The first `Policy OS` slice includes:

- `PolicyPack`
- `PolicySimulator`
- `PolicyDecisionReport`
- `PolicyEvaluationRecord`
- `PolicyScopeResolver`
- `PolicyLifecycleManager`
- `ApprovalEscalationPolicySuite`
- `RecoveryPolicyGate`
- `CompensationPolicyPlanner`
- `ProductionPolicyPack.toPolicyPack()`
- basic policy diff/version support through `PolicyPack.diff(...)`
- operator-facing explanation output through `PolicyDecisionReport.explain()`

These build on top of:

- `ToolPolicy`
- `GovernanceHooks`
- `ProductionPolicyPack`
- `TraceSerializer`

## What these surfaces are for

### `PolicyPack`

Use `PolicyPack` when you want:

- portable policy artifacts
- policy export/import independent of code deploys
- versioned policy metadata

### `PolicySimulator`

Use `PolicySimulator` when you want to:

- simulate policy decisions against synthetic requests
- simulate policy over stored runs
- simulate policy over portable trace bundles before rollout

### `PolicyDecisionReport`

Use `PolicyDecisionReport` when you want a structured result from policy
simulation instead of reading individual decision objects ad hoc.

It now also exposes operator-facing explanations through `explain()`.

### `PolicyEvaluationRecord`

Use `PolicyEvaluationRecord` when you want:

- a portable artifact for a completed policy evaluation
- a stable record that can be stored, attached to incidents, or used in eval flows
- explicit linkage between the evaluated subject and the resulting decision report

### `PolicyScopeResolver`

Use `PolicyScopeResolver` when you want to:

- compose policy across runtime, workflow, agent, and distributed handoff layers
- make inheritance precedence explicit instead of implicit in host glue code
- preserve restrictive allow/deny behavior when multiple scopes contribute policy

### `PolicyLifecycleManager`

Use `PolicyLifecycleManager` when you want to:

- maintain explicit `draft` and `active` policy packs
- promote a tested draft into the active baseline
- roll back to a previously active version with explicit rollback metadata

### `ApprovalEscalationPolicySuite`

Use `ApprovalEscalationPolicySuite` when you want to:

- simulate approval-gated runtime policy scenarios before rollout
- simulate escalation-gated coordination policy scenarios before rollout
- run both through one maintained eval-style report

### `RecoveryPolicyGate`

Use `RecoveryPolicyGate` when you want to:

- apply policy constraints to replay, branch, and resume recovery steps
- require approval for high-impact recovery actions through policy
- export a policy evaluation artifact for a recovery plan

### `CompensationPolicyPlanner`

Use `CompensationPolicyPlanner` when you want to:

- evaluate side-effecting completed work for compensation risk
- distinguish auto-compensate from approval-required compensation paths
- export a policy evaluation artifact for a compensation plan

## Maintained example

- [`examples/referencePolicySimulation.js`](../examples/referencePolicySimulation.js)

That example shows:

- building a portable policy artifact from `ProductionPolicyPack`
- exporting and re-importing the policy pack
- diffing one policy version against another
- simulating policy decisions over a run with multiple tool calls
- simulating the same policy over a portable trace bundle
- exporting a policy evaluation artifact
- generating operator-facing policy explanations
- running a policy scenario through `EvalHarness`

## Scoped policy inheritance

Scoped composition is now part of the maintained `v9` surface through
`PolicyScopeResolver`.

Use [`docs/policy-inheritance.md`](./policy-inheritance.md) and
[`examples/referencePolicyInheritance.js`](../examples/referencePolicyInheritance.js)
for the maintained inheritance contract.

## Coordination composition

Policy composition across runtime and coordination layers is now part of the
maintained `v9` surface through `CoordinationPolicyGate`.

Use [`docs/policy-coordination.md`](./policy-coordination.md) and
[`examples/referenceCoordinationPolicyGate.js`](../examples/referenceCoordinationPolicyGate.js)
for the maintained contract.

## Policy lifecycle

Promotion and rollback are now part of the maintained `v9` surface through
`PolicyLifecycleManager`.

Use [`docs/policy-lifecycle.md`](./policy-lifecycle.md) and
[`examples/referencePolicyLifecycle.js`](../examples/referencePolicyLifecycle.js)
for the maintained lifecycle contract.

## Approval and escalation simulation

Pre-rollout approval and escalation simulation is now part of the maintained
`v9` surface through `ApprovalEscalationPolicySuite`.

Use [`docs/policy-approval-escalation.md`](./policy-approval-escalation.md) and
[`examples/referenceApprovalEscalationPolicySuite.js`](../examples/referenceApprovalEscalationPolicySuite.js)
for the maintained contract.

## Recovery composition

Recovery policy composition is now part of the maintained `v9` surface through
`RecoveryPolicyGate`.

Use [`docs/policy-recovery.md`](./policy-recovery.md) and
[`examples/referenceRecoveryPolicyGate.js`](../examples/referenceRecoveryPolicyGate.js)
for the maintained contract.

## Compensation composition

Compensation policy composition is now part of the maintained `v9` surface
through `CompensationPolicyPlanner`.

Use [`docs/policy-compensation.md`](./policy-compensation.md) and
[`examples/referenceCompensationPolicyPlanner.js`](../examples/referenceCompensationPolicyPlanner.js)
for the maintained contract.

## Scope note

This is the first maintained slice of `v9`, not the full `Policy OS` vision.

Still ahead:

- policy promotion workflow from richer rollout states beyond draft/active
- stronger end-to-end policy audit trails
