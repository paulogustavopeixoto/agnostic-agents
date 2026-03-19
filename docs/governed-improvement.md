# Governed Improvement

`v13 Learning OS` starts by turning evidence into explicit, reviewable change
artifacts instead of hidden adaptation.

The maintained public surface now includes:

- `LearnedAdaptationArtifact`
- `ImprovementProposalEngine`
- `GovernedImprovementLoop`

## What this enables

- recommendation-to-change artifacts for routing, policy, decomposition, or verifier strategy
- portable proposal artifacts that can be exported and compared
- approval and rollback metadata attached to proposed changes
- governed review of proposed improvements through the existing adaptive-governance path

## Maintained example

- [`examples/referenceGovernedImprovement.js`](../examples/referenceGovernedImprovement.js)

That example shows:

- learning signals from failed runs and evals
- explicit improvement proposals
- portable learned-adaptation artifacts
- governed review requests recorded through the adaptive-governance layer
