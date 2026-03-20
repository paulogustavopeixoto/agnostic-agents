# AI Operating Layer

`agnostic-agents` now fits best as an AI operating layer rather than only an
provider-agnostic agent runtime.

That means the package is meant to give you one operable system across:

- runtime execution and replay
- policy and approval enforcement
- workflows and long-lived continuation
- capability-aware routing
- governed memory
- coordination and verification
- learning and adaptation review
- fleet rollout and rollback
- assurance before unsafe changes spread
- operator triage and intervention

## Adoption path

The practical adoption sequence is:

1. start with the runtime and policy layer
2. add workflows, replay, and durable state
3. add coordination where multi-actor quality matters
4. add governed learning only after replay and policy are stable
5. add fleet and assurance before widening autonomy
6. add budgeted autonomy and enterprise operating patterns last

## What “operating layer” means here

It does not mean hidden full autonomy.

It means:

- long-lived work is durable
- risky actions are inspectable and governed
- failures can be replayed and rolled back
- memory has provenance and access rules
- coordination has explicit safety controls
- operator intervention remains first-class

## Maintained references

- [`docs/enterprise-autonomy-architecture.md`](enterprise-autonomy-architecture.md)
- [`docs/unified-execution-graph.md`](unified-execution-graph.md)
- [`docs/operational-scorecards.md`](operational-scorecards.md)
- [`docs/autonomy-config-drift.md`](autonomy-config-drift.md)
- [`docs/coordination-safety.md`](coordination-safety.md)
- [`examples/referenceEnterpriseAutonomyArchitecture.js`](../examples/referenceEnterpriseAutonomyArchitecture.js)
- [`examples/referenceEnterpriseAutonomyBenchmarks.js`](../examples/referenceEnterpriseAutonomyBenchmarks.js)
