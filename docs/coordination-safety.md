# Coordination Safety

This guide covers the next maintained `v20 Enterprise Autonomy OS` slice.

The baseline surfaces are:

- `DelegationBudget`
- `SharedContextScope`
- `CoordinationSafetyGuard`

They add explicit anti-loop, anti-collusion, delegation-budget, and shared-context controls for multi-agent coordination.

## What This Adds

- loop detection when the same coordination action keeps repeating
- role-overlap detection for unsafe executor/verifier or executor/critic combinations
- delegation budgets by actor and overall coordination cycle
- scoped shared context so roles only receive the fields they should see

## Maintained Reference Example

See:

- [`examples/referenceCoordinationSafety.js`](../examples/referenceCoordinationSafety.js)

That example shows:

- repeated retry loop detection
- blocked executor/verifier overlap
- delegation-budget pressure
- redacted shared context by role
