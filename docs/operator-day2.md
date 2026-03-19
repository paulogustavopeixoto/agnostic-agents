# Operator Day-2 Guidance

This guide is the maintained public entry point for safe day-2 operation.

Use it when you need to:

- review a rollout candidate
- triage an incident across multiple runtime surfaces
- inspect a learned change before or after approval
- understand whether to monitor, pause, quarantine, or roll back

## Core day-2 loop

1. build an operator dashboard snapshot
2. inspect the current governance timeline
3. run the operator triage workflow
4. confirm the intervention recommendation
5. record the final governance decision

## Recommended maintained surfaces

- `OperatorDashboardSnapshot`
- `OperatorControlLoop`
- `OperatorTriageWorkflow`
- `GovernanceRecordLedger`
- `GovernanceTimeline`
- `AuditStitcher`

## Safe defaults

- do not approve rollout expansion without checking assurance verdicts
- do not replay or branch destructive steps without checkpoint review
- do not approve learned changes outside bounded adaptation envelopes
- keep rollback targets explicit before widening a rollout

## Maintained examples

- [`examples/referenceOperatorWorkflow.js`](../examples/referenceOperatorWorkflow.js)
- [`examples/referenceOperatorDashboard.js`](../examples/referenceOperatorDashboard.js)
