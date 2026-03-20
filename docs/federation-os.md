# Federation OS

`v22 Federation OS` starts by making governance portable across organizations
instead of assuming one local control plane owns every approval and audit event.

The maintained baseline for that is:

- `FederatedDelegationLedger`
- `FederatedAuditStitcher`
- `FederatedPromotionBoundaryAdvisor`
- `TrustCertificationExchange`
- `ExternalControlPlaneCertificationKit`

## What these surfaces do

### `FederatedDelegationLedger`

Use it when you want to:

- record approval or policy delegation across multiple organizations
- retain jurisdictions and environment scope on delegated authority
- keep delegation contracts inspectable and auditable

### `FederatedAuditStitcher`

Use it when you want to:

- stitch local and external governance ledgers into one ordered audit view
- keep federated approvals and policy reviews in one timeline
- inspect cross-plane candidate review without losing source attribution

### `FederatedPromotionBoundaryAdvisor`

Use it when you want to:

- apply regional or jurisdiction-aware promotion/rollback boundaries
- keep federated promotion decisions tied to boundary rules and rollback advice

### `TrustCertificationExchange`

Use it when you want to:

- exchange trust and certification signals across control planes
- publish portable certification and trust summaries for partner-operated stacks

### `ExternalControlPlaneCertificationKit`

Use it when you want to:

- certify partner dashboards and partner runtimes against a maintained federation contract
- distinguish basic integration from federation-ready external control-plane surfaces

## Maintained example

- [`examples/referenceFederatedGovernance.js`](../examples/referenceFederatedGovernance.js)
- [`examples/referenceFederatedBoundaries.js`](../examples/referenceFederatedBoundaries.js)
- [`examples/referenceFederatedControlPlane.js`](../examples/referenceFederatedControlPlane.js)
