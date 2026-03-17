# Ecosystem Certification Guidance

This document describes how to think about certification across the broader
`agnostic-agents` ecosystem.

Use it when you want to evaluate or publish:

- provider adapters
- environment adapters
- storage backends
- event sinks
- governance integrations
- other ecosystem-facing runtime integrations

It complements:

- [Provider certification](provider-certification.md)
- [Extension certification and compatibility](extension-certification.md)
- [Storage backends](storage-backends.md)

## Why this exists

The package now has multiple public extension surfaces.

That means ecosystem claims should be explicit at the same level as provider
support claims:

- what contract is implemented
- how strong the verification is
- whether the integration is documented and inspectable

## Certification families

Use these families to classify ecosystem integrations.

### 1. Provider adapters

Governed by:

- [Provider certification](provider-certification.md)
- [Support matrix](support-matrix.md)

Use this family for:

- `OpenAIAdapter`
- `GeminiAdapter`
- `AnthropicAdapter`
- `HFAdapter`
- `DeepSeekAdapter`

### 2. Environment adapters

Governed by:

- [Extension certification and compatibility](extension-certification.md)

Use this family for:

- browser adapters
- shell adapters
- API adapters
- queue adapters
- file adapters

### 3. Storage backends

Governed by:

- `BaseRunStore`
- `BaseJobStore`
- `BaseLayerStore`
- `StorageBackendRegistry`
- [Storage backends](storage-backends.md)

Use this family for:

- durable run stores
- durable job stores
- durable layer stores

### 4. Event, governance, and policy integrations

Governed by:

- `EventBus`
- `GovernanceHooks`
- `ToolPolicy`
- `ExtensionHost`
- [Extension certification and compatibility](extension-certification.md)

Use this family for:

- event sinks
- webhook governance bridges
- policy packs
- review and approval adapters

## Recommended certification levels

Use one common level vocabulary across ecosystem integrations.

### Level C0: Experimental

Use this when:

- the integration shape exists
- only exploratory checks or local usage exist
- public claims should stay minimal

### Level C1: Contract Verified

Use this when:

- the integration implements the documented public contract
- failure behavior is explicit
- at least one test or maintained example proves the path

### Level C2: Maintained Reference

Use this when:

- Level C1 is complete
- the repo ships a maintained example, doc, or reference integration
- operators can understand how it behaves from shipped materials

### Level C3: Operationally Proven

Use this when:

- Level C2 is complete
- the integration has been exercised in sustained or production-like usage
- operational caveats and recovery expectations are documented

The repo should be conservative about assigning `C3` unless there is clear,
repeatable evidence.

## Adapter guidance

For provider adapters:

- use the provider-specific certification labels from
  [Provider certification](provider-certification.md)
- do not replace those labels with the generic ecosystem levels

For environment adapters:

- certify the adapter as an ecosystem integration
- document which runtime actions and environments it supports
- document failure behavior and governance implications

## Backend guidance

For storage backends, certification should focus on:

- durability of run, checkpoint, and lineage records
- predictable list and lookup behavior for operator tooling
- replay and incident-debug compatibility
- behavior under restart and partial-failure conditions

For a backend to be called maintained, it should preserve:

- run summaries
- incident reports
- trace export fidelity
- branching/replay source integrity

## Minimum publication checklist

Before publishing an ecosystem integration as compatible with
`agnostic-agents`, check:

1. it only uses exported public surfaces
2. its contract boundary is documented
3. its failure behavior is explicit
4. at least one test or maintained example exists
5. operator-facing implications are documented when relevant
6. certification language matches actual verification depth

## Recommended public labels

Prefer short explicit labels such as:

- `experimental`
- `contract verified`
- `maintained reference`
- `operationally proven`

Avoid vague claims such as:

- `enterprise ready`
- `production grade` without scope
- `fully supported` without a stated certification level

## Related docs

- [Provider certification](provider-certification.md)
- [Extension certification and compatibility](extension-certification.md)
- [Storage backends](storage-backends.md)
- [Support matrix](support-matrix.md)
