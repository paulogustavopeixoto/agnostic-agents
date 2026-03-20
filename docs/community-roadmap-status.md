# Community Roadmap Status

This page is the short public milestone view for `agnostic-agents`.

The full roadmap in [`ROADMAP.md`](../ROADMAP.md) remains the source of truth.
This page exists so external users can see where the package stands without
reading the entire long-form planning document.

## Current status snapshot

### Completed foundation

- `v1` credible package surface
- `v2` reliable runtime
- `v3` advanced runtime-OS core
- `v5` production runtime maturity
- `v6` distributed runtime
- `v7` adaptive runtime
- `v9` Policy OS core
- `v10` State OS core
- `v11` Interop OS core
- `v12` Coordination OS core
- `v13` Learning OS core
- `v14` Fleet OS core
- `v15` Assurance OS core
- `v16` Operator OS core

### Completed higher-level coordination track

- structured critique
- trust-weighted disagreement resolution
- coordination loop
- decomposition advisor
- critique schemas and failure taxonomies
- coordination benchmarks

### `v8+` ecosystem progress

Completed:

- plugin authoring guide
- extension certification and compatibility guidance
- reference deployment integrations for common stacks
- public control-plane references
- run and trace visualization references
- support matrix by provider and feature
- contributor guidance and ecosystem maintenance criteria

Still open:

- broader ecosystem certification rollups for adapters and backends beyond the
  core shipped references
- clearer external milestone reporting as adoption grows

## Direction after the current release line

The current package already covers the `v11` through `v16` core program:

- `v11` Interop OS
- `v12` Coordination OS
- `v13` Learning OS
- `v14` Fleet OS
- `v15` Assurance OS
- `v16` Operator OS

The next direction is no longer just generic hardening.
It is a more explicit autonomy-operating-layer program built on top of the
completed core:

- `v17` Capability Fabric OS
- `v18` Memory Governance OS
- `v19` Budgeted Autonomy OS
- `v20` Enterprise Autonomy OS

That program should still include refinement, hardening, and broader ecosystem
uptake, but with a clearer systems goal:

- deeper external interoperability and certification depth
- stronger operator and ecosystem surfaces above the completed core
- governed-learning refinement instead of opaque self-modification
- capability-aware routing instead of static provider defaults
- governed memory instead of ad hoc retrieval/storage glue
- supervised autonomy instead of blind automation
- intelligence-source agnosticism across models, tools, simulators, verifiers, and humans

After the current `v16` core, the roadmap moves toward a fuller AI operating
layer:

1. make routing capability-aware and explainable
2. make memory governed and provenance-rich
3. make autonomy budgeted and supervised by default
4. converge those layers into one coherent operator-facing system

Current progress inside that next horizon:

- `v17` has started with a maintained `CapabilityRouter` surface for explainable
  capability-aware route ranking across models, simulators, and human-review paths
- `v17` also now includes route-aware coordination hooks and fleet-facing route diagnostics

The remaining themes inside that horizon are:

- tool reputation, certification, and simulation before risky execution
- jurisdiction- and tenant-scoped autonomy rules
- transactional and compensation-aware real-world action handling
- multi-agent anti-loop, anti-collusion, and scoped shared-context controls
- public AI operating-layer adoption guidance and maintained enterprise benchmarks

The current `v14` maintained baseline starts with rollout artifacts, fleet
health summaries, canary halt/rollback evaluation, fleet safety controls, and
before/after rollout impact comparison, plus rollback advice for broader fleet regressions.
The maintained operator guidance for that baseline now lives in the multi-runtime operations reference.
The current `v15` maintained baseline starts with explicit invariants, assurance suites, assurance reports, rollout guardrails, and rollback/quarantine planning.
The current `v16` maintained baseline starts with operator triage workflows, governance record stitching, governance timelines, dashboard snapshots, and control-loop references.

The important architectural rule is:

- runtime remains the execution/control substrate
- coordination remains a separate intelligence layer above it
- learning remains governed and reversible rather than hidden self-modification
- memory and autonomy should become more governed, not more opaque

## Recommended execution order

The intended sequence across the next horizon is:

1. `v17`: capability-aware routing and route governance
2. `v18`: memory provenance, retention, and trust boundaries
3. `v19`: autonomy budgets, uncertainty thresholds, and reusable supervision
4. `v20`: integrated operating-layer control across those surfaces

That order is intentional.
It keeps the package from becoming more autonomous in ways that are harder to
govern, inspect, or roll back.

## Highest-signal near-term open items outside `v8+`

- harden long-running background execution for production stores
- verify the Gemini example against a key with available quota
- define and communicate the `v4` ecosystem portability milestone more crisply
  in public materials

## How to interpret this

The runtime, interop, coordination, learning, fleet, assurance, and operator foundation are strong.

The remaining work is now mostly:

- ecosystem clarity
- operational hardening
- public certification depth
- interop, coordination, and learning refinement on top of the completed core

That is a healthier pre-release state than having major unresolved core
architecture work.

## Related docs

- [README.md](../README.md)
- [Support matrix](support-matrix.md)
- [Reference integrations](reference-integrations.md)
- [Ecosystem certification guidance](ecosystem-certification.md)
