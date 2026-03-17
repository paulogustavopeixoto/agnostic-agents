# Policy and Coordination

This document describes the maintained bridge between `v9 Policy OS` and the
coordination layer.

The goal is to let hosts apply explicit policy to coordination outcomes without
burying governance rules inside reviewer prompts or coordination handlers.

## Maintained surface

- `CoordinationPolicyGate`

Use it when you want to:

- evaluate coordination outcomes like `branch_and_retry` or `escalate` through policy
- gate coordination actions into a stricter path such as escalation
- export a portable policy evaluation artifact for a coordination decision

## How it works

`CoordinationPolicyGate` converts a coordination resolution into a policy
request with:

- tool name: `coordination:<action>`
- tags including `coordination`, the action name, and the strongest critique type
- a portable `PolicyPack` or scoped resolved pack behind the scenes

That means the same policy machinery used for runtime control can also govern
coordination decisions.

## Maintained example

- [`examples/referenceCoordinationPolicyGate.js`](../examples/referenceCoordinationPolicyGate.js)

That example shows:

- runtime and coordination-scoped policy packs
- a `branch_and_retry` resolution being evaluated through policy
- a deny rule converting that outcome into `escalate`
- a portable `PolicyEvaluationRecord` for the gated coordination outcome
