# Common Stack Integrations

This document maps common deployment stacks to maintained examples in the repo.

The goal is to make adoption easier without turning the package into a hosted
platform or prescribing one cloud vendor.

## 1. Local-first file-backed stack

Use this when you want:

- one machine or VM
- persisted runs, jobs, and memory
- approval handling without external infrastructure
- a good operator-friendly development or small-team baseline

Reference:

- [`examples/referenceFileBackedStack.js`](../examples/referenceFileBackedStack.js)

Key pieces:

- `FileRunStore`
- `FileJobStore`
- `FileLayerStore`
- `ApprovalInbox`
- `ProductionPolicyPack`

## 2. API service stack

Use this when you want:

- an HTTP-facing agent service
- approval-gated runs
- run inspection endpoints

Reference:

- [`examples/referenceExpressRuntimeServer.js`](../examples/referenceExpressRuntimeServer.js)

## 3. API + worker + control-plane split

Use this when you want:

- API submission in one process
- replay/continuation in another
- governance/event forwarding to a control plane

Reference:

- [`examples/referenceDeploymentSplit.js`](../examples/referenceDeploymentSplit.js)

## 4. Queue worker stack

Use this when you want:

- background execution
- queued remote continuation
- replayable worker behavior

Reference:

- [`examples/referenceQueueWorker.js`](../examples/referenceQueueWorker.js)

## 5. Durable custom backend stack

Use this when you want:

- custom persistence
- your own durable run/job/layer stores
- explicit backend registration

Reference:

- [`examples/referenceDurableBackends.js`](../examples/referenceDurableBackends.js)

## 6. Governance-oriented stack

Use this when you want:

- maintained production policy packs
- governance event capture
- approval-aware tool restrictions

References:

- [`examples/referenceProductionPolicyPack.js`](../examples/referenceProductionPolicyPack.js)
- [`docs/policy-governance-packs.md`](policy-governance-packs.md)

## Selection rule

If you do not need distributed execution yet, start with the local file-backed
stack. Move to the split deployment only when you actually need queueing,
service isolation, or a separate control plane.
