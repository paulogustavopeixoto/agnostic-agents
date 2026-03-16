# API Stability Policy

This document defines the public API stability, deprecation, and semantic versioning rules for `agnostic-agents`.

The goal is to keep the package strong as an open-source runtime OS:

- stable enough for real adoption
- honest about what is maintained
- flexible enough to keep improving without surprising users

## 1. What counts as the public API

For this package, the public API is the combination of:

- exports from [`index.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/index.js)
- the published type surface in [`index.d.ts`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/index.d.ts)
- documented maintained behaviors in:
  - [`README.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/README.md)
  - [`docs/api-reference.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/api-reference.md)
  - maintained docs and examples referenced from the README

If behavior is undocumented, unexported, or only reachable through internal files, it should not be treated as a stable public contract.

## 2. Stability tiers

### Maintained

These are expected to stay stable across normal releases, subject to semantic versioning.

Examples:

- root exports
- maintained runtime classes
- documented examples and guides
- portable trace schema once documented

### Compatibility-only

These remain available to reduce upgrade pain, but they are not the preferred forward path.

Examples:

- `Task`
- `Orchestrator`

Compatibility-only APIs may receive less feature work and may be deprecated in a future major version.

### Internal

Anything under internal implementation details that is not part of the documented published surface is internal.

Internal surfaces may change without notice between releases.

## 3. Deprecation policy

Deprecation should be explicit and documented.

When an API is deprecated:

- it should remain functional for at least one meaningful migration window unless there is a security or correctness reason not to
- the preferred replacement should be documented
- the deprecation should be called out in:
  - `CHANGELOG.md`
  - the migration guides when relevant
  - the API reference or README when the deprecated surface is still exported

Preferred deprecation pattern:

1. mark the old surface as compatibility-only
2. document the replacement
3. keep the old surface working through a transition period
4. remove only in a major-version boundary

## 4. Semantic versioning rules

This package follows a practical semver model.

### Patch releases

Patch releases may include:

- bug fixes
- documentation corrections
- non-breaking internal refactors
- stricter validation when it fixes incorrect behavior without changing intended public semantics

Patch releases should not:

- remove public exports
- silently change maintained behavior in a way that breaks normal users

### Minor releases

Minor releases may include:

- new maintained APIs
- new guides and examples
- additive fields in summaries, traces, or reports where existing consumers continue to work
- new runtime features that do not break documented behavior

Minor releases may also:

- mark compatibility-only APIs as deprecated
- add stronger recommended paths in docs

### Major releases

Major releases are required for:

- removing a public export
- changing the meaning of a documented maintained API
- changing stable data shapes in a breaking way
- removing compatibility-only APIs after a documented migration window

## 5. Data-shape rules

Some public behavior is not just classes and methods. It also includes structured outputs.

Treat these as public contracts when documented:

- `RunInspector.summarize(...)`
- portable trace schema from `TraceSerializer`
- incident report shape from `IncidentDebugger`
- governance event payload conventions used in maintained examples/docs

Rule:

- additive fields are acceptable in minor releases
- field removal or meaning changes require a major release

## 6. Example and doc stability

Maintained examples and docs are part of the public adoption path.

That means:

- examples referenced from the README should keep working
- docs should describe the maintained path, not stale historical behavior
- when the preferred path changes, update docs and migration guides in the same release

## 7. Provider and capability claims

Provider and capability claims must follow the documented certification process.

Do not treat:

- a local unit test
- a one-off manual run
- an undocumented example

as equivalent to a maintained support promise.

Use:

- [`docs/provider-certification.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/provider-certification.md)
- [`docs/provider-compatibility.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/provider-compatibility.md)

## 8. Release expectations

Before broadening support claims or changing maintained behavior:

- update docs
- update migration guides when relevant
- update changelog
- keep the published package contents aligned with the docs

## 9. Current interpretation

Today, the maintained forward path is:

- `Agent.run()` plus inspectable `Run` objects
- `Workflow` and `WorkflowRunner`
- governance, replay, branching, traces, and operator tooling

Today, the compatibility path is:

- `Task`
- `Orchestrator`

That distinction should remain visible in docs until those compatibility exports are eventually removed in a future major release.
