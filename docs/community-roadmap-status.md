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

## Forward path after the current release line

The next longer-range sequence is now:

- `v10` State OS
  - make runtime state more deterministic, portable, and restorable
- `v11` Interop OS
  - make the runtime contracts easier for third-party tools and control planes to implement
- `v12` Coordination OS
  - make critique, trust, disagreement, and decomposition stronger as first-class coordination systems
- `v13` Learning OS
  - turn evidence, evals, and incidents into governed behavioral improvement

The important architectural rule is:

- runtime remains the execution/control substrate
- coordination remains a separate intelligence layer above it
- learning remains governed and reversible rather than hidden self-modification

## Recommended execution order

The intended sequence across the forward path is:

1. strengthen governance and policy first
2. strengthen state portability and restoration next
3. publish those contracts through stronger interoperability
4. deepen coordination quality on top of that substrate
5. only then close the loop with governed learning

In shorter form:

- `v10`: make runtime state more portable and deterministic
- `v11`: make those contracts public and interoperable
- `v12`: strengthen coordination intelligence above the runtime
- `v13`: turn evidence into governed learning loops

That order is intentional.
It keeps the package from becoming smarter in ways that are harder to govern,
restore, inspect, or validate.

## Highest-signal near-term open items outside `v8+`

- harden long-running background execution for production stores
- verify the Gemini example against a key with available quota
- define and communicate the `v4` ecosystem portability milestone more crisply
  in public materials

## How to interpret this

The runtime and coordination foundation are strong.

The remaining work is now mostly:

- ecosystem clarity
- operational hardening
- public certification depth
- `v10+` state, interop, coordination, and learning evolution

That is a healthier pre-release state than having major unresolved core
architecture work.

## Related docs

- [README.md](../README.md)
- [Support matrix](support-matrix.md)
- [Reference integrations](reference-integrations.md)
- [Ecosystem certification guidance](ecosystem-certification.md)
