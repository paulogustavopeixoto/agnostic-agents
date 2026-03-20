# Proof OS

`v21 Proof OS` is about proving risky autonomy changes before promotion, not
just running examples and hoping the stack behaves in production.

The maintained baseline for that is:

- `ReleaseEvidenceBundle`
- `RoutePromotionProof`
- `PolicyAutonomyAttestation`
- `PreReleaseSimulationSuite`
- `FailureInjectionSuite`
- `ProofPromotionGate`

## What these surfaces do

### `ReleaseEvidenceBundle`

Use it when you want to:

- combine assurance, benchmark, fleet, governance, route-proof, and attestation data
- produce one promotion record for a release candidate
- make rollout decisions explicit and inspectable

### `RoutePromotionProof`

Use it when you want to:

- compare a shadow-routed candidate against the current route
- document rollback targets and approvals
- keep route promotion tied to evidence instead of heuristics

### `PolicyAutonomyAttestation`

Use it when you want to:

- attest which policy pack and autonomy envelope were approved
- capture jurisdiction coverage and approvers
- carry regulated or high-risk approval context into a release record

### `PreReleaseSimulationSuite`

Use it when you want to:

- rehearse route drift, memory drift, and autonomy-envelope changes before promotion
- run one proof-oriented simulation surface instead of scattered checks

### `FailureInjectionSuite`

Use it when you want to:

- rehearse worker, fleet, and control-plane failure handling before promotion
- keep chaos-style checks attached to proof and release workflows

### `ProofPromotionGate`

Use it when you want to:

- require evidence, simulation, and failure-injection artifacts before promotion
- block release candidates that are missing route proofs or attestations

## Maintained example

- [`examples/referenceProofArtifacts.js`](../examples/referenceProofArtifacts.js)
- [`examples/referenceProofRehearsal.js`](../examples/referenceProofRehearsal.js)
