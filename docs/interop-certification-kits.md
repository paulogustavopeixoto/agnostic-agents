# Interop Certification Kits

`v11 Interop OS` needs certification that is executable, not just narrative.

The maintained baseline for that is:

- `CertificationKit`
- `DeploymentPatternCertificationKit`
- `CompatibilitySummary`

## What these surfaces do

### `CertificationKit`

Use it when you want to:

- evaluate provider-adapter contract compatibility conservatively
- evaluate run, job, or layer store compatibility through public base contracts
- produce public-facing certification results without depending on repo internals

### `DeploymentPatternCertificationKit`

Use it when you want to:

- certify end-to-end deployment patterns rather than isolated components
- check service layout, autonomy controls, environment scopes, and approval boundaries
- distinguish basic contract support from operational deployment readiness

### `CompatibilitySummary`

Use it when you want to:

- aggregate certification or conformance results into one summary
- publish compatibility rollups by level and validity
- compare contract support across multiple integration families

## Maintained example

- [`examples/referenceCertificationKit.js`](../examples/referenceCertificationKit.js)
- [`examples/referenceDeploymentPatternCertification.js`](../examples/referenceDeploymentPatternCertification.js)
