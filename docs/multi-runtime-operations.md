# Multi-Runtime Operations

`v14 Fleet OS` needs a clear operator model for running many schedulers,
workers, and adaptive rollout paths at once without losing the single-runtime
mental model.

Use this guide when you are operating:

- multiple worker processes
- multiple environments such as `staging` and `prod`
- multiple tenant-scoped rollout boundaries
- rollout of policy, coordination, or learned changes across a fleet

## Recommended operating model

Keep one coherent runtime story even when execution is physically split:

- one rollout artifact per change candidate
- one shared fleet-health summary view
- one place to compare pre-rollout and post-rollout impact
- one rollback path that points back to the prior stage or version

In practice, that means:

- use `FleetRolloutPlan` to define staged rollout and scope
- use `FleetHealthMonitor` to summarize fleet health across environments and tenants
- use `FleetCanaryEvaluator` for staged canary promotion or halt decisions
- use `FleetSafetyController` for concurrency, backlog, saturation, and risk-budget enforcement
- use `FleetImpactComparator` to compare baseline fleet state with post-change fleet state
- use `FleetRollbackAdvisor` when broader fleet signals say the rollout should reverse

## Minimum operator loop

For every fleet-scoped change:

1. Create a rollout artifact with explicit stage boundaries.
2. Capture baseline fleet health before rollout.
3. Run the canary stage and collect post-stage fleet health.
4. Evaluate:
   - canary trigger status
   - fleet safety budgets
   - before/after impact comparison
   - rollback advice
5. Either promote the next stage, throttle, halt, or roll back.

## What to watch

The highest-signal fleet metrics in the current maintained surface are:

- `runs`
- `failedRuns`
- `adaptiveRegressions`
- `schedulerBacklog`
- `maxSaturation`

Those are enough to answer:

- is the fleet overloaded?
- did the change increase failure pressure?
- did learned behavior start regressing outcomes?
- should the rollout stop before it spreads?

## Boundary rules

Use environment and tenant boundaries explicitly.
Do not treat fleet rollout as global by default.

Good patterns:

- `staging` before `prod`
- one tenant cohort before all tenants
- one learned-change bundle per rollout artifact

Avoid:

- mixing unrelated changes into one fleet rollout
- promoting a new stage without recording baseline vs post-stage health
- treating fleet safety decisions as advisory-only when risk budgets are already exceeded

## Relationship to existing docs

Use this guide with:

- [Fleet OS](fleet-os.md)
- [Operator architecture](operator-architecture.md)
- [Operator workflows](operator-workflows.md)
- [Reference integrations](reference-integrations.md)
- [Public control-plane references](public-control-plane-references.md)
