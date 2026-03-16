# Storage Backend Guidance

This guide describes the maintained storage backend expectations for `agnostic-agents` in production-like environments.

The package ships:

- `InMemoryRunStore`
- `FileRunStore`
- `InMemoryJobStore`
- `FileJobStore`
- `InMemoryLayerStore`
- `FileLayerStore`

Those are good for:

- local development
- tests
- small single-process environments

For longer-running or more serious deployments, you should implement the base store contracts yourself.

## When to move beyond file and in-memory stores

Move to custom durable stores when you need:

- multi-process access
- stronger crash recovery expectations
- operational backup and restore workflows
- more predictable long-running scheduler persistence
- external storage durability guarantees

## Maintained contracts

Use these as the integration boundary:

- `BaseRunStore`
- `BaseJobStore`
- `BaseLayerStore`

That lets the runtime stay stable while your persistence layer evolves.

## Production-oriented expectations

For run stores:

- writes should be durable enough for replay and incident analysis
- reads should preserve the full run record without dropping checkpoints, events, or lineage
- list operations should be predictable enough for operator tooling

For job stores:

- scheduled jobs should survive process restarts
- run count, history, and next execution state should be stored durably
- job handlers should assume retries and duplicate process boundaries are possible

For layer stores:

- policy/profile/working-memory state should have clear persistence rules
- storage should not silently lose values across restarts
- access patterns should match the expected application profile

## Durability notes for long-running schedulers

If you use `BackgroundJobScheduler` in a production-like environment:

- persist jobs in a durable backend, not memory
- store run ids or durable references when job execution creates inspectable runs
- assume process restarts can happen between scheduling and execution
- keep handlers idempotent where possible
- treat scheduler persistence and run persistence as related but separate concerns

## Durability notes for replay persistence

Replay and incident analysis depend on run durability.

That means:

- checkpoint data should remain intact after restarts
- branch/replay source runs should stay readable for as long as operators need them
- exported traces should be used for long-lived forensic workflows when storage boundaries are uncertain

## Backend migration guidance

When moving from file/local stores to durable stores:

1. keep the runtime surface unchanged
2. swap the backend implementation behind the base store contracts
3. verify that run summaries, incident reports, and trace exports still behave the same
4. only then migrate long-running schedulers and memory layers

Recommended migration order:

1. `RunStore`
2. `JobStore`
3. `LayerStore`

This order protects replay, incident debugging, and scheduling first.

## Maintained reference example

See:

- [`examples/referenceDurableBackends.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/referenceDurableBackends.js)

That example shows:

- custom run/job/layer stores
- atomic file-write style persistence
- registration through `StorageBackendRegistry`

## Safe defaults

- prefer append-safe or atomic write patterns
- avoid partial writes to the canonical record
- do not mix durable and in-memory stores casually in the same critical path
- keep store implementations small and explicit
- validate new backends with the operator and replay tooling after migration
