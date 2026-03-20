# Autonomy Policies

This guide covers the next maintained `v19 Budgeted Autonomy OS` slice.

The baseline surfaces are:

- `AutonomyPolicyRegistry`
- `InterventionPolicyRegistry`
- `ApprovalDecisionCache`

They extend the earlier autonomy envelope so supervised autonomy can vary by tenant, jurisdiction, environment, and task family.

## What This Adds

- tenant- and jurisdiction-aware autonomy policies that can require review or block specific tools
- operator-defined intervention policies for high-risk operational situations
- reusable approval caching with explicit revocation and audit-friendly summaries

## Maintained Reference Example

See:

- [`examples/referenceAutonomyPolicies.js`](../examples/referenceAutonomyPolicies.js)

That example shows:

- a production EU tenant policy that forces review and blocks one tool
- an operator intervention policy for high-risk release review work
- approval reuse before revocation
