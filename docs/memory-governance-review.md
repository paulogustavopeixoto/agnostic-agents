# Memory Governance Review

This guide covers the operator-facing review layer for governed memory.

The maintained surfaces are:

- `MemoryAuditView`
- `MemoryGovernanceBenchmarkSuite`
- `MemoryGovernanceDiagnostics`
- `MemoryGovernanceReviewWorkflow`

Use them when you want to turn raw memory audit records into:

- audit summaries
- provenance and retention benchmark checks
- operator-facing flags and recommendations
- one compact review workflow before rollout or broader autonomy

## Maintained Reference Example

See:

- [`examples/referenceMemoryGovernanceReview.js`](../examples/referenceMemoryGovernanceReview.js)

That example shows:

- building a governed memory audit trail
- benchmarking provenance and contract coverage
- generating diagnostics from blocked reads, conflicts, and benchmark results
- producing a compact operator review checklist
