# Policy Inheritance

This document describes the maintained scoped policy composition surface for
`v9 Policy OS`.

The goal is to let hosts compose policy across runtime, workflow, agent, and
distributed handoff layers without baking one inheritance model into the core
runtime loop.

## Maintained surface

- `PolicyScopeResolver`

Use it when you want to:

- compose runtime-wide guardrails with narrower workflow or agent rules
- preserve stricter allow/deny boundaries across scopes
- make distributed handoff policy explicit instead of hidden in host code

## Scope model

Supported scopes:

- `runtime`
- `workflow`
- `agent`
- `handoff`

Aliases:

- `distributedHandoff` -> `handoff`
- `distributed` -> `handoff`
- `delegation` -> `agent`

Default precedence is:

1. `runtime`
2. `workflow`
3. `agent`
4. `handoff`

Higher-precedence scopes win by being placed earlier in the resolved rule order.

## Composition rules

- rules are ordered from highest precedence to lowest precedence
- `denyTools` are unioned across scopes
- `allowTools` are intersected across scopes when multiple allowlists exist
- the highest-precedence scope provides the final pack identity/version when set

This keeps inherited policy narrowing by default instead of widening silently.

## Maintained example

- [`examples/referencePolicyInheritance.js`](../examples/referencePolicyInheritance.js)

That example shows:

- runtime, workflow, agent, and handoff packs
- explicit scope precedence
- allowlist narrowing
- denylist union
- handoff policy overriding a lower-precedence approval rule
