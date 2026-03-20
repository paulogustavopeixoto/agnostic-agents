# Fleet OS

`v14 Fleet OS` starts by turning rollout into a first-class governed surface
instead of leaving staged deployment logic hidden in host code.

The maintained public surface now includes:

- `FleetRolloutPlan`
- `FleetHealthMonitor`
- `FleetCanaryEvaluator`
- `FleetSafetyController`
- `FleetImpactComparator`
- `FleetRollbackAdvisor`
- `RouteFleetDiagnostics`

## What this enables

- staged rollout artifacts for runtime, policy, or learned changes
- fleet-level health summaries across environments and tenants
- canary decisions that can halt and roll back rollout when fleet health regresses
- fleet safety decisions for concurrency, backlog, regression, saturation, and rollout boundaries
- rollout-impact comparison between baseline fleet state and post-change fleet state
- rollback advice driven by broader post-rollout regression patterns
- route-health diagnostics for degraded providers, route saturation, and route drift

## Maintained example

- [`examples/referenceFleetRollout.js`](../examples/referenceFleetRollout.js)

That example shows:

- staged rollout percentages and scoped rollout boundaries
- fleet health summaries with regression and backlog signals
- canary evaluation that halts rollout on unhealthy adaptive changes
- fleet safety control that halts or throttles work when budgets are exceeded
- rollout-impact comparison showing whether the fleet actually improved after a change
- route diagnostics showing degraded and drifting intelligence paths across the fleet
- rollback advice when broader fleet metrics worsen after rollout

## Operator guidance

For the maintained day-2 operating model across multiple workers,
environments, and tenants, see [Multi-runtime operations](multi-runtime-operations.md).
