# Policy Lifecycle

This document describes the maintained lifecycle surface for `v9 Policy OS`.

The goal is to make draft promotion and rollback explicit instead of leaving
policy rollout state in ad hoc host code.

## Maintained surface

- `PolicyLifecycleManager`

Use it when you want to:

- keep an active policy pack and a draft policy pack
- promote a tested draft into the active baseline
- roll back to a previously active version with explicit rollback metadata

## Lifecycle model

`PolicyLifecycleManager` keeps:

- `draft`
- `active`
- `history`

Promotion:

- makes the draft active
- stores the previous active pack in history
- records rollback metadata for that prior active version

Rollback:

- restores a historical active version by `version` or `policyPackId`
- records the current active pack as a rollback source in history

## Maintained example

- [`examples/referencePolicyLifecycle.js`](../examples/referencePolicyLifecycle.js)

That example shows:

- baseline active policy `1.0.0`
- draft policy `1.1.0`
- promotion of the draft to active
- rollback from `1.1.0` back to `1.0.0`
