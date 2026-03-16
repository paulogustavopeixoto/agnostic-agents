# Reference Integrations

These reference integrations show how to use `agnostic-agents` as a runtime OS inside common deployment patterns.

They are not full products. They are thin patterns you can adapt into your own service, worker, or control plane.

## 1. API-facing runtime service

Use this pattern when you want an HTTP service that:

- accepts user requests
- creates runtime-backed agent runs
- pauses on approval-gated actions
- returns an inspectable run id for later resume or replay

Reference file:

- [`examples/referenceExpressRuntimeServer.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/referenceExpressRuntimeServer.js)

Use it for:

- internal copilots
- support automation APIs
- agent-backed product endpoints
- thin hosted control planes

Key runtime pieces:

- `Agent`
- `RunInspector`
- `InMemoryRunStore` or `FileRunStore`
- `ApprovalInbox`
- `GovernanceHooks`

## 2. Worker / queue / scheduler process

Use this pattern when you want a background runtime that:

- pulls work from a queue or scheduler
- executes queued continuations with runtime persistence
- records runs for inspection, replay, and handoff recovery
- supports recurring tasks when paired with a scheduler

Reference file:

- [`examples/referenceQueueWorker.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/referenceQueueWorker.js)

Use it for:

- queued remote continuation
- worker pools that consume persisted run envelopes
- nightly syncs
- long-running enrichment jobs
- internal research pipelines
- recurring agent health checks

Key runtime pieces:

- `DistributedRunEnvelope`
- `TraceCorrelation`
- `Agent` or `WorkflowRunner`
- `QueueEnvironmentAdapter`
- `InMemoryRunStore` or `FileRunStore`

## 3. Offline incident debugging and replay

Use this pattern when you want to inspect a past run without re-executing the live system.

Reference file:

- [`examples/referenceIncidentDebug.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/referenceIncidentDebug.js)

Use it for:

- production incident analysis
- replay prep
- diffing two run outcomes
- support and operations workflows

Key runtime pieces:

- `IncidentDebugger`
- `RunTreeInspector`
- `TraceSerializer`
- `TraceDiffer`
- `FileRunStore`

For operator triage and recovery procedures, see [`docs/operator-workflows.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/operator-workflows.md).
For distributed handoff and correlation guidance, see [`docs/distributed-execution.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/distributed-execution.md).

## 4. Suggested production split

For most serious systems, split the runtime into separate processes:

- API service
  - receives requests
  - creates runs
  - handles approval resolution
- worker service
  - executes scheduled or queued work
  - runs planning / workflow jobs
- storage layer
  - persists runs, jobs, and memory backends
- control plane
  - inspects runs
  - renders run trees
  - compares traces
  - drives incident debugging

That keeps the runtime portable and lets each deployment choose its own transport, UI, and persistence.

For a fuller operator-facing architecture view, see [`docs/operator-architecture.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/operator-architecture.md).

## 5. Storage recommendation

For local development:

- `InMemoryRunStore`
- `InMemoryJobStore`
- `InMemoryLayerStore`

For simple persisted environments:

- `FileRunStore`
- `FileJobStore`
- `FileLayerStore`

For larger systems:

- implement `BaseRunStore`
- implement `BaseJobStore`
- implement `BaseLayerStore`
- register them through `StorageBackendRegistry`

## 6. Trace export recommendation

Use trace export in two layers:

- per-run trace export with `TraceSerializer.exportRun(...)`
- incident or batch export with `TraceSerializer.exportBundle(...)`

That gives external systems a stable schema without requiring direct access to in-memory runtime objects.
