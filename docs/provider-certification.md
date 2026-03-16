# Provider Certification

This document defines the adapter and provider certification process for `agnostic-agents`.

The goal is simple:

- do not overclaim provider support
- make support levels explicit
- separate mocked contract coverage from live operational confidence

## Certification levels

### Level 0: Experimental

Use this level when:

- an adapter exists
- the adapter is incomplete or recently changed
- only local/manual checks exist

Requirements:

- adapter compiles and exports
- unsupported capabilities reject consistently
- no public claim beyond experimental support

### Level 1: Contract Verified

Use this level when the adapter passes the normalized repo contract.

Requirements:

- unit tests cover:
  - `generateText()`
  - `getCapabilities()`
  - `supports(capability)`
  - tool-call normalization if supported
  - unsupported capability rejection via `AdapterCapabilityError`
- provider capability map is documented in [`docs/provider-compatibility.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/provider-compatibility.md)

This means the adapter matches the runtime contract.
It does not yet mean the provider is operationally verified in a live account.

### Level 2: Live Smoke Verified

Use this level when the adapter passes live smoke tests in this repo.

Requirements:

- Level 1 complete
- live test exists in [`tests/live/adapters.live.test.js`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/tests/live/adapters.live.test.js)
- live text generation passes against a real provider account
- if the adapter exposes embeddings or another key capability that the package relies on heavily, at least one such capability is live-tested too

This means the adapter works against a real account, but only at smoke-test depth.

### Level 3: Runtime Verified

Use this level when the adapter has been exercised in maintained runtime flows.

Requirements:

- Level 2 complete
- at least one maintained runtime example or integration path is verified end-to-end
- run inspection, checkpointing, and runtime behavior have been exercised through that provider path

This is the strongest public support label in the repo today.

## Capability certification

Certification applies at two layers:

- adapter-level certification
- capability-level certification

An adapter can be live verified for text generation while image or audio features remain contract-only.

Public docs should distinguish:

- supported by contract
- live smoke verified
- runtime verified

## Required checks for a maintained adapter

Every maintained adapter should have:

- normalized capability exposure
- unit coverage for supported and unsupported capabilities
- live smoke coverage when credentials and provider conditions allow
- documented default test model
- documented limitations or account caveats
- secret handling documented according to [`docs/secret-handling.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/secret-handling.md)

## Certification workflow for changes

When changing an adapter:

1. update unit tests
2. update capability documentation if behavior changed
3. run live smoke tests when credentials are available
4. update certification status in `provider-compatibility.md`
5. only then broaden public support claims

## Skippable live-test conditions

The repo treats some live failures as operationally skippable rather than product regressions:

- quota exhaustion
- billing or credit issues
- model availability mismatches
- provider-side inference unavailability

Those conditions should block a promotion to a stronger certification level for that provider run, but they should not be recorded as framework contract failures.

## Current interpretation in this repo

As of the current `v4` roadmap state:

- OpenAI: strongest live/runtime verification path
- DeepSeek: strong live smoke path
- Gemini: contract verified, live verification depends on provider quota
- Anthropic: contract verified with live text smoke path available when credentials allow
- Hugging Face: contract verified with live text smoke path available when credentials allow

This should be kept current whenever support claims change.
