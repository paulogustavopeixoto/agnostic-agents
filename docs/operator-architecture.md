# Operator Architecture Guidance

This document describes the recommended operator-facing deployment shape for `agnostic-agents`.

The package is intentionally open-source and provider-agnostic. The operator architecture should preserve that by keeping runtime control concerns separate from product-specific application logic.

## Recommended split

For production-oriented deployments, separate the runtime into four concerns:

### 1. Request surface

Responsibilities:

- receive user or system requests
- create runs and workflow executions
- return run ids and status references
- hand off execution to worker or runtime services

Typical form:

- HTTP API
- internal service endpoint
- queue producer

### 2. Runtime execution layer

Responsibilities:

- execute agents, workflows, and schedulers
- persist checkpoints and events
- handle approvals, policy checks, and verification
- emit traces and audit records

Typical form:

- worker process
- API-side execution service
- queue consumer

### 3. Persistence layer

Responsibilities:

- store runs
- store jobs
- store memory layers
- store audit records and exported traces when needed

Typical form:

- file-backed stores for simple environments
- durable custom implementations of `BaseRunStore`, `BaseJobStore`, and `BaseLayerStore` for larger systems

### 4. Operator control plane

Responsibilities:

- inspect runs and run trees
- review incident reports
- compare traces
- resolve approvals
- manage replay, branching, and export workflows

Typical form:

- internal admin UI
- CLI tool
- support/operations dashboard

## Deployment guidance

### Keep control and execution separate

Do not mix the operator control plane directly into the model execution path.

Reason:

- operators need stable inspection and review paths even when runtime execution is degraded
- replay and incident debugging often happen after the live execution window

### Keep storage contracts stable

Use the base store contracts as the integration boundary:

- `BaseRunStore`
- `BaseJobStore`
- `BaseLayerStore`

That lets you move from local/file-backed storage to durable storage without rewriting runtime logic.

### Treat approvals as externalizable

Use:

- `ApprovalInbox`
- `GovernanceHooks`
- audit sinks

This keeps governance logic visible to operators and lets approval decisions survive process restarts.

### Prefer durable trace exports for serious incidents

For high-severity incidents:

- export a trace bundle
- persist the incident report
- capture the comparison run if one exists

That creates a stable forensic record without depending on in-memory state.

## Safe deployment defaults

- enable `piiSafe: true` on maintained sinks in shared or production-like environments
- use tool allowlists/denylists for integrations with side effects
- keep tool auth in host-controlled config through the auth propagation model
- keep runtime execution and operator UI on separate trust boundaries
- avoid destructive replay without checkpoint review

## Minimum operator surface for a serious deployment

At minimum, provide operators with:

- run summary view
- run tree view
- incident report generation
- trace diff capability
- approval resolution path
- trace export path

Without those, the runtime may be technically powerful but operationally weak.

## Reference files

- [`docs/operator-workflows.md`](operator-workflows.md)
- [`docs/reference-integrations.md`](reference-integrations.md)
- [`examples/referenceOperatorWorkflow.js`](../examples/referenceOperatorWorkflow.js)
- [`examples/referenceDeploymentSplit.js`](../examples/referenceDeploymentSplit.js)
