# Policy and Recovery

This document describes the maintained bridge between `v9 Policy OS` and the
runtime recovery surfaces.

The goal is to make replay, branch, and resume constraints governable through
policy instead of hardcoding those rules into recovery runners.

## Maintained surface

- `RecoveryPolicyGate`

Use it when you want to:

- evaluate a recovery plan before branch or replay execution
- require approval for high-impact recovery actions through policy
- export a portable evaluation artifact for a recovery plan

## How it works

`RecoveryPolicyGate` converts each recovery step into a policy request:

- `recovery:branch_from_failure_checkpoint`
- `recovery:partial_replay`
- `recovery:resume_replay`

That lets hosts govern recovery through the same policy machinery used for tool
and coordination control.

## Maintained example

- [`examples/referenceRecoveryPolicyGate.js`](../examples/referenceRecoveryPolicyGate.js)

That example shows:

- branch recovery being gated into `require_recovery_approval`
- partial replay remaining allowed
- one `PolicyEvaluationRecord` summarizing the recovery-plan policy outcome
