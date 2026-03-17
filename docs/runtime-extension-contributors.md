# Runtime Extension Contributor Guidance

This guide is for contributors adding or reviewing runtime extensions and
ecosystem-facing extension docs.

## Contribution rule

Treat runtime extensions as public infrastructure, not as shortcuts for private
repo assumptions.

## Good extension contributions

Good contributions:

- use exported package surfaces only
- keep extension behavior explicit
- include at least one maintained example or focused test
- document operator impact when policy or governance is involved
- preserve portability across stores, transports, and providers

## Weak extension contributions

Weak contributions:

- depend on unexported internal files
- hide control behavior in undocumented callbacks
- assume one deployment stack or cloud platform
- bypass runtime inspection or governance surfaces
- add extension points without documenting stability expectations

## What contributors should provide

For a meaningful extension-facing contribution, provide:

- the extension surface or guidance update
- tests or a maintained example
- docs for behavior and constraints
- a note about compatibility expectations

## Review questions

When reviewing an extension-related contribution, ask:

1. is this built on maintained public surfaces?
2. is the behavior inspectable by an operator?
3. does failure remain explicit?
4. does this keep the runtime agnostic?
5. does this deserve maintained status or only experimental status?

## Where to document extension work

- authoring patterns: [`docs/plugin-authoring.md`](plugin-authoring.md)
- certification and compatibility: [`docs/extension-certification.md`](extension-certification.md)
- store-specific guidance: [`docs/storage-backends.md`](storage-backends.md)
