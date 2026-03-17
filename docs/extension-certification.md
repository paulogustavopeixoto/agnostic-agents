# Extension Certification and Compatibility

This document defines the maintained extension certification path for
`agnostic-agents`.

It exists so extension claims stay as explicit as provider claims.

## What this document covers

- certified extension patterns
- compatibility and validation guidance
- review criteria for ecosystem-facing extensions

## Certified extension patterns

The repo currently treats these extension contribution types as the certified
surface:

- `eventSinks`
- `governanceHooks`
- `policyRules`
- `environmentAdapters`
- `evalScenarios`

These map directly to `ExtensionHost`.

### Store-related pattern

Stores are not currently contributed through `ExtensionHost`, but they are a
maintained ecosystem pattern through:

- `BaseRunStore`
- `BaseJobStore`
- `BaseLayerStore`
- `StorageBackendRegistry`

For ecosystem purposes, store integrations should be treated as certified when
they implement the documented base-store contracts and are registered through
the maintained registry surface.

### Adapter-related pattern

Environment adapters are a certified extension pattern through:

- `BaseEnvironmentAdapter`
- `BrowserEnvironmentAdapter`
- `ShellEnvironmentAdapter`
- `ApiEnvironmentAdapter`
- `QueueEnvironmentAdapter`
- `FileEnvironmentAdapter`

Provider adapters remain governed by the provider certification process in
[`docs/provider-certification.md`](provider-certification.md), not by the
extension process alone.

### Sink-related pattern

Event sinks are a certified extension pattern through:

- `EventBus`
- `FileAuditSink`
- `WebhookEventSink`
- custom sinks implementing `handleEvent(event, run)`

## Compatibility guidance

An extension is compatible when:

- it only uses exported package surfaces
- it contributes through documented extension points
- it does not depend on private runtime internals
- it remains additive rather than patching core behavior invisibly
- it follows the package governance and logging expectations

An extension is not considered compatible if it:

- imports internal unexported files
- mutates runtime internals after registration
- assumes hidden execution ordering
- bypasses policy, approval, or traceability surfaces

## Validation checklist

Before calling an extension maintained or certified, check:

1. it registers cleanly through `ExtensionHost` or the documented store/adapter registry
2. contributed surfaces have at least one unit or example check
3. errors fail clearly rather than silently degrading
4. the extension behavior is documented for operators
5. any policy/governance behavior is inspectable
6. any eval scenarios are deterministic enough for normal repo use

## Suggested certification levels

### Level E0: Experimental

Use this when:

- the extension shape exists
- only local or exploratory checks exist

### Level E1: Contract Verified

Use this when:

- the extension registers through maintained package surfaces
- at least one unit or example check proves the contribution path
- compatibility constraints are documented

### Level E2: Maintained Reference

Use this when:

- Level E1 is complete
- the repo ships a maintained example or reference usage
- the extension behavior is appropriate for public docs

## Review criteria

Review ecosystem-facing extensions for:

- contract clarity
- operator inspectability
- failure behavior
- portability
- documentation quality
- testability
- absence of hidden product assumptions

## Related docs

- [`docs/plugin-authoring.md`](plugin-authoring.md)
- [`docs/provider-certification.md`](provider-certification.md)
- [`docs/storage-backends.md`](storage-backends.md)
