# Interop Schema Evolution

`v11 Interop OS` needs stable public artifacts, but stability does not mean
freezing every schema forever.

This document describes the maintained schema-evolution posture for the current
public artifact formats.

## Current public artifact formats

- `agnostic-agents-extension-manifest`
- `agnostic-agents-run-trace`
- `agnostic-agents-trace-bundle`
- `agnostic-agents-policy-pack`
- `agnostic-agents-policy-evaluation`
- `agnostic-agents-state-bundle`
- `agnostic-agents-eval-report`

## Evolution rules

1. keep `format` stable for a given artifact family
2. use `schemaVersion` to represent meaningful structure changes
3. prefer additive change before breaking change
4. keep validation warnings explicit when reading older or newer compatible payloads
5. document when a change requires a migration rather than tolerant parsing

## Compatibility expectations

- additive fields should not break existing consumers
- missing required fields should fail validation clearly
- version differences should be surfaced as warnings when safe to tolerate
- format changes should fail fast rather than silently coercing payloads

## Maintained compatibility fixture example

- [`examples/referenceInteropArtifacts.js`](../examples/referenceInteropArtifacts.js)

That example validates the current maintained artifact families through one
shared compatibility suite.

## Backward and forward compatibility stance

Backward compatibility:

- newer maintained readers should continue reading older maintained artifact
  payloads when required fields still satisfy the validator
- incompatible payloads should fail clearly rather than be silently coerced

Forward compatibility:

- older consumers should ignore additive unknown fields when the required
  maintained fields are still present
- `format` and `schemaVersion` should be treated as the primary compatibility
  signals before deeper artifact parsing
