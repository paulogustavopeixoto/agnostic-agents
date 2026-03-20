# Deployment Pattern Certification

`v20 Enterprise Autonomy OS` needs certification depth that maps to how
real systems are actually deployed, not just whether isolated components satisfy
one base contract.

The maintained surface for that is:

- `DeploymentPatternCertificationKit`

## What it does

Use it when you want to:

- certify reference deployment patterns, not just isolated adapters or stores
- check whether a stack declares the right services, boundaries, and autonomy controls
- combine contract-verified stores/providers with higher-level operational pattern checks

## Supported maintained patterns

- `supervised_autonomy_stack`
- `remote_control_plane`
- `public_control_plane`
- `deployment_split`

## Maintained example

- [`examples/referenceDeploymentPatternCertification.js`](../examples/referenceDeploymentPatternCertification.js)
