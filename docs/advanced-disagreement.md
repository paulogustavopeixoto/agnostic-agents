# Advanced Disagreement

`v12 Coordination OS` needs disagreement handling that can use more than one
generic weighted-impact heuristic.

The current maintained coordination surface now supports:

- task-family-aware trust records
- role-aware trust scoring
- recovery and retry weighted trust outcomes
- disagreement strategies beyond one weighted ranking path

## Maintained disagreement strategies

- `weighted_impact`
- `majority_vote`
- `trust_consensus`
- `severity_first`

## Why this matters

This lets coordination systems vary how they resolve conflict:

- some tasks should prefer clear majority signals
- some high-risk tasks should prefer severity-first review
- some review flows should depend on accumulated trust by role and task family

## Maintained example

- [`examples/referenceAdvancedDisagreement.js`](../examples/referenceAdvancedDisagreement.js)

That example shows:

- role-aware trust records for verifier and critic actors
- trust profiles by task family and role
- disagreement resolution using the `trust_consensus` strategy
