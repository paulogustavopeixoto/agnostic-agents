# Migration: v2 to v3

Use this guide when moving from the first runtime layer to the `v3` runtime-OS core.

## What changed

`v3` extended the runtime from:

- inspectable single-run execution

to:

- explicit delegation
- planning with verify/recover phases
- recurring scheduling
- evidence and assessment
- learning/eval signals
- stronger runtime operating-system primitives

## Main migration changes

### Keep `Run` as the execution center

This did not change.

The upgrade is not about replacing runs.
It is about attaching more runtime systems to them.

### Add delegation through explicit contracts

New maintained surfaces:

- `DelegationRuntime`
- `DelegationContract`
- `AgentWorkflowStep`

Use these when:

- multiple agents hand work to each other
- you want child-run lineage and metrics
- you want delegation to be inspectable instead of ad hoc

### Move planning logic into `PlanningRuntime`

If you had application-specific planning glue, `v3` gives you a maintained surface:

- `PlanningRuntime`

Use it when:

- plans need verification
- execution may recover from failure
- planning needs its own runtime events and stored runs

### Move recurring/background work to `BackgroundJobScheduler`

New maintained surfaces:

- `BackgroundJobScheduler`
- `InMemoryJobStore`
- `FileJobStore`

Use these when:

- work repeats on a schedule
- jobs need durable tracking
- background runtime execution should be inspectable

### Adopt evidence and assessment where grounding matters

New maintained surfaces:

- `EvidenceGraph`
- run assessment fields
- self-verification and confidence signals

Use them when:

- the system makes grounded claims
- you need conflict detection
- you want higher-trust runtime outputs

## Minimal upgrade checklist

- keep `v2` runs and workflows
- add `DelegationRuntime` if you have multi-agent flows
- add `PlanningRuntime` if planning/recovery matters
- move recurring jobs into `BackgroundJobScheduler`
- use evidence/assessment features for grounded or high-stakes paths

## Before / after mental model

Before:

- the runtime tracks execution

After:

- the runtime also coordinates delegation, planning, recovery, scheduling, and evidence

## Good first step

If you only make one change during this migration, make it this:

- replace ad hoc planning or delegation glue with `PlanningRuntime` or `DelegationRuntime` so lineage and inspection stay inside the runtime
