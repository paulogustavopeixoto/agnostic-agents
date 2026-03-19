# Interop OS

`v11 Interop OS` starts by making ecosystem compatibility explicit and
machine-readable.

The first maintained slice includes:

- `ExtensionManifest`
- `ConformanceKit`
- `InteropContractValidator`

## What these surfaces are for

### `ExtensionManifest`

Use `ExtensionManifest` when you want to:

- declare what public contracts an ecosystem package implements
- publish contribution types and compatibility claims in a stable format
- avoid relying on prose-only compatibility descriptions

### `ConformanceKit`

Use `ConformanceKit` when you want to:

- validate a manifest against the maintained public manifest contract
- verify that an extension registers cleanly through `ExtensionHost`
- verify base store compatibility without depending on repo internals

### `InteropContractValidator`

Use `InteropContractValidator` when you want to:

- validate manifest or artifact files from another repo
- run conformance checks without importing local test helpers
- turn file-based compatibility checks into a small external CI step

## Maintained example

- [`examples/referenceInteropManifest.js`](../examples/referenceInteropManifest.js)
- [`examples/referenceExternalConformanceFlow.js`](../examples/referenceExternalConformanceFlow.js)

That example shows:

- generating a manifest from an extension contribution
- validating extension compatibility
- validating a job-store integration through the conformance kit
- validating portable manifest/eval files through the external contract-validator flow
