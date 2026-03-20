# Reference Integrations

These reference integrations show how to use `agnostic-agents` as a runtime OS inside common deployment patterns.

They are not full products. They are thin patterns you can adapt into your own service, worker, or control plane.

For named common-stack mappings, see [`docs/common-stack-integrations.md`](common-stack-integrations.md).

## 1. API-facing runtime service

Use this pattern when you want an HTTP service that:

- accepts user requests
- creates runtime-backed agent runs
- pauses on approval-gated actions
- returns an inspectable run id for later resume or replay

Reference file:

- [`examples/referenceExpressRuntimeServer.js`](../examples/referenceExpressRuntimeServer.js)

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

- [`examples/referenceQueueWorker.js`](../examples/referenceQueueWorker.js)

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

- [`examples/referenceIncidentDebug.js`](../examples/referenceIncidentDebug.js)

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

For operator triage and recovery procedures, see [`docs/operator-workflows.md`](operator-workflows.md).
For distributed handoff and correlation guidance, see [`docs/distributed-execution.md`](distributed-execution.md).

## 4. Public control plane and visualization

Use this pattern when you want a thin service or UI layer that:

- reads durable runs without owning runtime execution
- renders lineage and run trees
- shows incident summaries and recovery recommendations
- compares traces across retries, branches, or releases

Reference file:

- [`examples/referencePublicControlPlane.js`](../examples/referencePublicControlPlane.js)

Key runtime pieces:

- `RunTreeInspector`
- `IncidentDebugger`
- `TraceDiffer`
- `TraceSerializer`
- `FileRunStore` or another durable `BaseRunStore`

Related docs:

- [`public-control-plane-references.md`](public-control-plane-references.md)
- [`run-trace-visualization.md`](run-trace-visualization.md)

## 5. Suggested production split

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

For a fuller operator-facing architecture view, see [`docs/operator-architecture.md`](operator-architecture.md).
For remote governance callback patterns, see [`docs/remote-control-planes.md`](remote-control-planes.md).
For fleet rollout and multi-runtime control guidance, see [`docs/multi-runtime-operations.md`](multi-runtime-operations.md).

Maintained split reference:

- [`examples/referenceDeploymentSplit.js`](../examples/referenceDeploymentSplit.js)
- [`examples/referenceEnterpriseAutonomyArchitecture.js`](../examples/referenceEnterpriseAutonomyArchitecture.js)

For the higher-level supervised-autonomy operating model that ties API, worker,
storage, control plane, incident handling, recovery, and rollback into one
reference architecture, see
[`docs/enterprise-autonomy-architecture.md`](enterprise-autonomy-architecture.md).
For explicit environment, approval-organization, external-system, and
transactional side-effect references, see
[`docs/enterprise-boundaries.md`](enterprise-boundaries.md) and
[`docs/transactional-execution.md`](transactional-execution.md).

## 6. Storage recommendation

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

## 7. Trace export recommendation

Use trace export in two layers:

- per-run trace export with `TraceSerializer.exportRun(...)`
- incident or batch export with `TraceSerializer.exportBundle(...)`

That gives external systems a stable schema without requiring direct access to in-memory runtime objects.
