# Benchmarking and Regression Evals

This document defines the maintained benchmark and regression discipline for `agnostic-agents`.

The goal is not leaderboard theater.
The goal is to catch runtime regressions early and keep provider-agnostic behavior credible.

## Current maintained eval categories

The package now maintains baseline coverage for:

- prompt-level regression checks
- tool selection accuracy checks
- RAG grounding checks
- replay-based regression checks

These are implemented with `EvalHarness` and are intended to be:

- deterministic
- fast enough for normal CI
- focused on runtime behavior rather than raw model taste

## What each category means

### Prompt-level regression

Question:

- did a known prompt path still produce the expected shaped answer?

Use it for:

- stable prompts in examples
- output-format regressions
- safety/restriction regressions in maintained flows

### Tool selection accuracy

Question:

- when a tool should obviously be selected, did the runtime still take the tool path?

Use it for:

- tool calling regressions
- adapter normalization regressions
- policy and approval interactions that accidentally break tool use

### RAG grounding

Question:

- when retrieved context is available, does the output still reflect that grounding path?

Use it for:

- retrieval prompt wiring regressions
- context formatting regressions
- grounding/evidence regressions

### Replay-based regression

Question:

- does frozen replay preserve the expected runtime outcome for a previously recorded run?

Use it for:

- replay drift detection
- regression checks on checkpoint/replay internals
- validating that inspection/replay surfaces still preserve stable execution records

## Maintained benchmark example

See:

- [`examples/referenceEvalBenchmarks.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/referenceEvalBenchmarks.js)

It demonstrates a minimal benchmark report across:

- prompt regression
- tool selection accuracy
- RAG grounding
- replay regression

## Maintained test coverage

See:

- [`tests/evals.unit.test.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/tests/evals.unit.test.js)
- [`examples/referenceReplayBenchmarks.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/examples/referenceReplayBenchmarks.js)

This test is the current baseline regression suite for the maintained benchmark categories above.

## What is not complete yet

The following roadmap items are still intentionally separate:

- benchmark fixtures against competing frameworks
- broader provider-comparison benchmark summaries

Those require a wider benchmark discipline than the current baseline regression harness.

## Benchmarking rules

- prefer deterministic scenarios over provider-dependent variance
- benchmark runtime behavior, not just raw text quality
- keep benchmark fixtures small and inspectable
- export traces when a regression needs deeper incident analysis
- do not market benchmark claims that are not maintained in the repo
