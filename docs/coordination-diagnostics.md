# Coordination Diagnostics

`v12 Coordination OS` needs operator-facing summaries for coordination failures,
not just raw benchmark outputs.

The maintained coordination surface now includes:

- `CoordinationDiagnostics`

## What it summarizes

- reviewer disagreement
- operator escalation
- missing coordination roles
- verification escalation and disagreement
- coordination-quality warnings such as low verifier quality

## Maintained example

- [`examples/referenceCoordinationDiagnostics.js`](../examples/referenceCoordinationDiagnostics.js)

That example shows a compact operator-facing diagnostic summary built from:

- review/resolution state
- role-routing gaps
- verification state
- coordination quality signals
