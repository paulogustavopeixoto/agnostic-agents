# Production Deployment Profile

Status: proposal, not an approved or verified actual deployment.
Owner acceptance and infrastructure access remain missing; paid-test spend is zero. This file does
not silently substitute a local fixture for the actual deployment acceptance gate.

## Proposed Reference Topologies

| Profile | Purpose | Required verification |
| --- | --- | --- |
| Local | One trusted worker, file run/job/layer stores, FileVectorStore, private local artifact store | Restart, corruption, private permissions, stale-writer reconciliation and bounded resources |
| Staging/production candidate | At least two worker processes, transactional durable state, private artifacts and selected real vector services | Ownership/fencing, atomic approvals/budgets, tenant authentication, deletion, partitions, restore and target load |

The production state backend is not yet selected or implemented as a certified SQL
run/job/layer stack. PostgreSQL is a proposal for a transactional reference, not a
completed adapter. pgvector vector queries alone do not provide durable run ownership.
Artifact hosting, identity, network/firewall provisioning, KMS and worker deployment
belong to the host; core should provide bounded interfaces and enforcement hooks.

## Required Non-Secret Configuration

- Named owner and profile ID/version; staging topology, regions and permitted endpoints.
- Exact provider/model/voice/API/SDK tuple selections and allowed fallback rules.
- Supported Node/OS versions; current local execution reports Node v23.10.0, not evidence of a supported LTS matrix.
- State/lock/transaction backend, connection strategy, schema migration and statement/deadline limits.
- Vector resource IDs, namespaces, dimensions/metrics, index/payload configuration and tenancy controls.
- Artifact backend, version/hash policy, allowed import destinations, byte/codec limits and signed-URL rules.
- Authentication/authorization integration, actor/tenant identity source, privileged operator roles and approval-signing key ownership.
- Approved total/per-provider spend, concurrency ceilings, load/soak duration and synthetic test datasets.
- Retention/deletion objectives, backups/restore, legal-hold decisions, RPO/RTO and reconciliation owners.
- Realtime transport/device/network profile, timestamp boundaries, VAD/audio/video formats and agreed SLOs.
- Independent review scope, reviewer access, authorization, test windows and remediation/retest process.

Supply credentials through secure host configuration. Never commit credential values,
customer media or raw production traces. A secret's presence does not prove permission
to exercise arbitrary accounts, destructive tests or unbounded billable generation.

## Current Blockers

The owner authorized no paid tests and has no staging contact/deployment available
for now. Independent review remains an owner action to arrange, not an engaged
reviewer. No exact-model release matrix has been approved. Optional Qdrant/pg host drivers and
dedicated vector test resources are absent from current preflight. Package-local work
can continue; actual deployment and independent-review gates remain unverified.
