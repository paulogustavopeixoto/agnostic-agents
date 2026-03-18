# Interop OS

`v11 Interop OS` starts by making ecosystem compatibility explicit and
machine-readable.

The first maintained slice includes:

- `ExtensionManifest`
- `ConformanceKit`

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

## Maintained example

- [`examples/referenceInteropManifest.js`](../examples/referenceInteropManifest.js)

That example shows:

- generating a manifest from an extension contribution
- validating extension compatibility
- validating a job-store integration through the conformance kit
