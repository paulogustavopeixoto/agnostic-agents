# Interop Contract Validation

This document describes a maintained contract-validation flow that can run from
another repo after installing `agnostic-agents`.

The goal is simple:

- produce portable manifest or artifact JSON in the external package
- validate those files through the published interop surfaces
- avoid depending on this repo's test internals

## Public validator surface

Use:

- `ConformanceKit` when validation is already in memory
- `InteropContractValidator` when validation should run from artifact files

## Supported file types in the maintained flow

- `manifest`
- `trace`
- `traceBundle`
- `policyPack`
- `policyEvaluation`
- `stateBundle`
- `evalReport`

## Maintained example

- [`examples/referenceExternalConformanceFlow.js`](../examples/referenceExternalConformanceFlow.js)

That example simulates an external package writing a manifest and eval report to
disk, then validating both through `InteropContractValidator`.
