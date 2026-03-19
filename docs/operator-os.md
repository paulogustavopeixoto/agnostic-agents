# Operator OS

`v16 Operator OS` extends the package into stronger day-2 operator control.

The first maintained baseline is:

- `OperatorSummary`
- `OperatorInterventionPlanner`
- `OperatorTriageWorkflow`
- `GovernanceRecordLedger`
- `AuditStitcher`
- `GovernanceTimeline`

These surfaces sit on top of the runtime, fleet, assurance, and learning
layers instead of replacing them.

## What this layer adds

- operator-centered summaries across runs, incidents, rollouts, assurance, and learned changes
- explicit intervention plans for pause, limit, rollback, quarantine, and monitor decisions
- a maintained cross-runtime triage workflow built from existing runtime evidence
- long-horizon governance records across policy, learning, replay, rollout, and rollback events
- stitched audit chains for one major change or incident path
- operator-facing timelines for understanding change propagation over time

## Maintained example

Run:

```bash
npm run example:reference-operator
```

That example shows:

- run-tree inspection
- incident report generation
- trace diffing and partial trace export
- operator-centered summary building
- intervention recommendations for rollback/quarantine/monitoring
- a cross-runtime triage workflow built from runtime, fleet, and assurance signals
- governance record capture across policy, learning, rollout, replay, and rollback
- stitched audit output for one correlated major change
- rendered governance timeline for operator review
