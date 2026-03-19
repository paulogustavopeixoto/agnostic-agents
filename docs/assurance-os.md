# Assurance OS

`v15 Assurance OS` starts by turning invariants and pre-rollout scenario checks
into explicit assurance artifacts instead of relying on operator intuition.

The maintained public surface now includes:

- `InvariantRegistry`
- `AssuranceSuite`
- `AssuranceReport`
- `AssuranceGuardrail`
- `AssuranceRecoveryPlanner`

## What this enables

- invariant definitions across policy, state, coordination, and learning surfaces
- scenario bundles that run before rollout
- explicit assurance verdicts with violation reports and operator summaries
- rollout guardrails that can block unsafe change candidates
- rollback and quarantine planning tied to failed assurance signals

## Maintained example

- [`examples/referenceAssuranceSuite.js`](../examples/referenceAssuranceSuite.js)

That example shows:

- policy and learning invariants
- branch, replay, recovery, and coordination assurance scenarios
- an explicit `allow` or `block` assurance verdict
- operator-facing explanation output for failed invariants
- rollout guardrail and rollback/quarantine planning
