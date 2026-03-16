# Benchmark Fixtures

This document defines the maintained comparison-fixture baseline for `agnostic-agents`.

The goal is to keep cross-framework benchmarking honest and reproducible.

The package does not currently claim measured superiority over other frameworks in-repo.
What it does maintain now is a shared comparison fixture set so benchmark runs can be aligned across systems.

## Maintained fixture file

See:

- [`tests/fixtures/benchmark-framework-fixtures.json`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/tests/fixtures/benchmark-framework-fixtures.json)

That fixture defines the current comparison dimensions for:

- `agnostic-agents`
- `langgraph`
- `autogen`
- `crewai`

## Current comparison dimensions

- `prompt_regression`
- `tool_selection_accuracy`
- `rag_grounding`
- `replay_regression`

These are runtime-behavior dimensions, not “vibes” benchmarks.

## What the fixtures are for

Use the fixture file to:

- keep benchmark categories aligned across frameworks
- avoid silently changing the comparison surface
- make future benchmark runs easier to interpret

## What the fixtures are not

These fixtures are not:

- a published leaderboard
- measured performance results
- a claim that all frameworks implement the same semantics

They are only the maintained comparison scaffold.

## Maintained validation

See:

- [`tests/benchmark-fixtures.unit.test.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/tests/benchmark-fixtures.unit.test.js)

That test ensures the fixture schema stays stable as the benchmark discipline evolves.
