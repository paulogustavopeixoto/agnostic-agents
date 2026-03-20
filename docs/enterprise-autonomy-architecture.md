# Enterprise Autonomy Architecture

This guide covers the next maintained `v20 Enterprise Autonomy OS` slice.

The baseline surfaces are:

- `EnterpriseAutonomyArchitecture`
- `EnterpriseOperatingModel`

They describe how the package behaves as one supervised-autonomy operating model across services, operators, incident handling, recovery, and rollback.

## What This Adds

- a public reference architecture for API, worker, storage, and control-plane roles
- a cross-surface operating model for incident, approval, checkpoint, recovery, rollback, and fleet phases

## Maintained Reference Example

See:

- [`examples/referenceEnterpriseAutonomyArchitecture.js`](../examples/referenceEnterpriseAutonomyArchitecture.js)

That example shows:

- one API/worker/control-plane architecture view
- one incident-to-recovery operating model
- one unified graph summary connected to the same operating story
