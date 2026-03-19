# Interop Certification Kits

`v11 Interop OS` needs certification that is executable, not just narrative.

The maintained baseline for that is:

- `CertificationKit`
- `CompatibilitySummary`

## What these surfaces do

### `CertificationKit`

Use it when you want to:

- evaluate provider-adapter contract compatibility conservatively
- evaluate run, job, or layer store compatibility through public base contracts
- produce public-facing certification results without depending on repo internals

### `CompatibilitySummary`

Use it when you want to:

- aggregate certification or conformance results into one summary
- publish compatibility rollups by level and validity
- compare contract support across multiple integration families

## Maintained example

- [`examples/referenceCertificationKit.js`](../examples/referenceCertificationKit.js)
