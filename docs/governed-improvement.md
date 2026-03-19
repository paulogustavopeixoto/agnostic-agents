# Governed Improvement

`v13 Learning OS` starts by turning evidence into explicit, reviewable change
artifacts instead of hidden adaptation.

The maintained public surface now includes:

- `LearnedAdaptationArtifact`
- `ImprovementProposalEngine`
- `ImprovementActionPlanner`
- `GovernedImprovementLoop`
- `AdaptationPolicyEnvelope`
- `ImprovementEffectTracker`
- `LearningBenchmarkSuite`
- `AdaptationRegressionGuard`

## What this enables

- recommendation-to-change artifacts for routing, policy, decomposition, or verifier strategy
- portable proposal artifacts that can be exported and compared
- concrete action plans that translate proposals into runtime or coordination changes
- approval and rollback metadata attached to proposed changes
- governed review of proposed improvements through the existing adaptive-governance path
- bounded adaptation policies that keep learned changes inside explicit safety envelopes
- operator-facing summaries of reviewed changes and measured effects
- benchmark suites that measure whether learned changes improved outcomes
- regression guards that can halt adaptation when learned changes destabilize behavior

## Maintained example

- [`examples/referenceGovernedImprovement.js`](../examples/referenceGovernedImprovement.js)

That example shows:

- learning signals from failed runs and evals
- explicit improvement proposals
- concrete action plans for runtime or coordination changes
- portable learned-adaptation artifacts
- artifact comparison across different learned changes
- governed review requests recorded through the adaptive-governance layer
- bounded adaptation decisions for allowed versus denied changes
- post-change effect tracking and operator-facing review summaries
- learning benchmark reports for measured improvement quality
- regression-guard decisions when changes become harmful
