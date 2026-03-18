# Policy and Compensation

This document describes the maintained bridge between `v9 Policy OS` and
compensation planning for side-effecting work.

The goal is to make compensation recommendations explicit and governable
through policy instead of leaving them as implicit host logic.

## Maintained surface

- `CompensationPolicyPlanner`

Use it when you want to:

- evaluate completed side-effecting work for compensation risk
- distinguish auto-compensate from approval-required compensation
- export a policy evaluation artifact for a compensation plan

## How it works

`CompensationPolicyPlanner` converts each compensable entry into a policy
request such as:

- `compensation:send_status_update`
- `compensation:cache_temp_record`

That lets hosts govern compensation through the same policy machinery used for
runtime, coordination, and recovery control.

## Maintained example

- [`examples/referenceCompensationPolicyPlanner.js`](../examples/referenceCompensationPolicyPlanner.js)

That example shows:

- external-write compensation requiring approval
- internal cleanup compensation remaining auto-compensatable
- one `PolicyEvaluationRecord` summarizing the compensation-plan policy outcome
