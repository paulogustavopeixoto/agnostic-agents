# Deployment Certification

This guide covers the final maintained `v20 Enterprise Autonomy OS` maturity slice.

The baseline surface is:

- `DeploymentPatternCertificationKit`

It extends certification from single adapters and stores into real deployment patterns.

## What This Adds

- certification checks for API/worker/control-plane stacks
- certification checks for supervised-autonomy operating stacks
- certification checks for public control-plane deployments

## Maintained Reference Example

See:

- [`examples/referenceDeploymentCertification.js`](../examples/referenceDeploymentCertification.js)

That example shows:

- a deployment-verified API/worker/control-plane pattern
- a deployment-verified supervised-autonomy stack
- one public compatibility summary across both
