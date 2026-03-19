# Interop Artifact Registry

`v11 Interop OS` needs one public import/export surface that can handle the
maintained artifact families without each integration having to know every
individual class.

`InteropArtifactRegistry` provides that surface.

## Supported artifact types

- `tool`
- `trace`
- `traceBundle`
- `policyPack`
- `policyEvaluation`
- `evalReport`
- `stateBundle`
- `manifest`

## Why this matters

This keeps third-party integrations simpler:

- one entry point for export
- one entry point for import
- maintained artifact formats stay explicit
- schema/version handling still belongs to the individual artifact classes

## Maintained example

- [`examples/referenceInteropRegistry.js`](../examples/referenceInteropRegistry.js)

That example shows a single registry exporting and importing:

- a tool schema artifact
- a portable run trace
- a portable policy pack
- an eval report artifact
- an extension manifest
