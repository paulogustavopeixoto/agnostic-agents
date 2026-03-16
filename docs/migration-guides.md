# Migration Guides

This document is the maintained entry point for version-to-version migration in `agnostic-agents`.

Use it when upgrading across the major runtime phases that shaped the current package:

- [`docs/migration-v1-to-v2.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/migration-v1-to-v2.md)
- [`docs/migration-v2-to-v3.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/migration-v2-to-v3.md)
- [`docs/migration-v3-to-v4.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/migration-v3-to-v4.md)

## Which guide should you use?

### From the earlier toolkit-style package

Use:

- `v1 -> v2`

When:

- you mainly used `Agent`, `Tool`, and basic examples
- you are moving toward runtime-backed runs, checkpoints, approvals, and structured events

### From the first runtime layer

Use:

- `v2 -> v3`

When:

- you already use runs and runtime-backed workflows
- you now want delegation, planning/recovery, scheduling, evidence, and runtime-OS primitives

### From the runtime-OS core

Use:

- `v3 -> v4`

When:

- you already rely on replay, governance, and scheduling
- you now want run trees, trace diffing, incident debugging, governance hooks, extension/storage portability, and operator-facing runtime control

## Upgrade principle

The package evolved by adding stronger runtime layers, not by discarding the open-source runtime direction.

So the safe migration pattern is:

1. adopt the maintained surface for your current phase
2. move away from compatibility-only APIs where the guides say so
3. add the newer runtime controls only where your application actually benefits from them

## Current maintained direction

The maintained path in the package today is:

- `Agent.run()` with inspectable `Run` objects
- `Workflow` and `WorkflowRunner` for orchestration
- replay, branching, traces, and governance as first-class runtime controls
- operator and storage contracts as part of the public surface

Legacy compatibility exports remain available where documented, but the migration guides below describe the preferred path forward.
