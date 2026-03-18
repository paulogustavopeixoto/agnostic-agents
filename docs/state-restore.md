# State Restore

This document describes the maintained cross-environment restore planning
surface for `v10 State OS`.

The goal is to make state restoration across environments explicit and
repeatable instead of leaving restore steps implicit in deployment glue.

## Maintained surface

- `StateRestorePlanner`

Use it when you want to:

- validate a portable state bundle before restore
- produce an environment-aware restore checklist
- make replay/resume expectations explicit after restore

## What it plans

`StateRestorePlanner` builds steps such as:

- `validate_state_bundle`
- `provision_target_runtime_store`
- `restore_run_state`
- `restore_memory_layers`
- `verify_lineage_and_checkpoints`
- `resume_or_replay_from_restored_state`

## Maintained example

- [`examples/referenceStateRestorePlanner.js`](../examples/referenceStateRestorePlanner.js)

That example shows:

- a paused run prepared for remote replay
- a portable state bundle moving from `api-service` to `worker-service`
- a restore plan that validates the bundle before replay/resume
