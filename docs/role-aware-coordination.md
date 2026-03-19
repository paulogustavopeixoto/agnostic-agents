# Role-Aware Coordination

`v12 Coordination OS` starts by making coordination roles explicit instead of
treating every agent as interchangeable.

This layer introduces:

- `CoordinationRoleContract`
- `RoleAwareCoordinationPlanner`
- `CoordinationTrace`

## Why it matters

Role-aware coordination improves three things at once:

- assignments become explainable
- trust can be applied by domain and role instead of flat agent equality
- decomposition can be shaped by who is actually available to plan, execute,
  verify, critique, and aggregate

## Public roles

The maintained public role set is:

- `planner`
- `executor`
- `verifier`
- `critic`
- `aggregator`

## Maintained example

- [`examples/referenceRoleAwareCoordination.js`](../examples/referenceRoleAwareCoordination.js)

That example shows:

- trust-weighted role assignment
- role contracts derived for a high-risk release-review task
- an inspectable coordination trace for operator review
