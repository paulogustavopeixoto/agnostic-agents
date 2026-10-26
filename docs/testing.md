# Testing Guide

## Test commands

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:live
npm run test:coverage
npm run test:all
npm run test:foundation
npm run test:types
```

## Test groups

`test:foundation` runs local tests, strict public TypeScript checks, and an offline
scoped multimodal example. It includes focused tests for context projection,
conversation archives, logical tenant isolation, stream interruption, artifact size
limits, policy failures, remote job resumption, and a committed run surviving SIGKILL.
It does not establish live-provider conformance, exhaustive fault coverage, or enterprise certification.

- `test:unit`
  - mocked/unit coverage for adapters, agent runtime, package modules, and maintained local examples
- `test:integration`
  - cross-module tests for the maintained public surface
- `test:live`
  - live provider smoke tests using real API keys
- `test:coverage`
  - full coverage report

## Environment variables for live tests

The live suite reads the following keys from `.env` or the process environment:

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `HUGGINGFACE_API_KEY`
- `DEEPSEEK_API_KEY`

Optional provider model overrides:

- `OPENAI_TEST_MODEL`
- `GEMINI_TEST_MODEL`
- `ANTHROPIC_TEST_MODEL`
- `HUGGINGFACE_TEST_MODEL`
- `DEEPSEEK_TEST_MODEL`

## Secret handling for tests

Test credentials should follow the baseline secret guidance in [`docs/secret-handling.md`](secret-handling.md).
For tools that need host-supplied credentials, follow the auth propagation model in [`docs/tool-auth-propagation.md`](tool-auth-propagation.md).

In practice:

- keep live keys in `.env` or the process environment only
- never commit test credentials or provider cookies
- use fake tokens and placeholder secrets in fixtures
- avoid logging raw credential material in test helpers or debug output

## Initial Certification Targets

The shortlist contains ten model/media providers and a separate set of three vector
backends. Anthropic, OpenAI and Gemini remain the primary text-smoke subset. Run
`npm run test:certify:preflight` for an offline configuration check, then explicitly
opt into paid API calls with `npm run test:certify:providers`. The latter requires
credentials and explicit test model IDs for all three; it does not certify every
capability. Use test:certify:vectors:preflight for offline driver/configuration checks
and test:certify:vectors for explicit live checks against dedicated test resources.
test:certify:expanded explicitly opts into ten-provider live smoke, including paid
media generation and private job records for reconciliation. It is not run by the
offline foundation check. Media-reference smoke is not an asset-download/security test.
See [initial-support-targets.md](initial-support-targets.md).

## Notes on live tests

- Live tests are smoke tests, not exhaustive provider certification.
- Missing credentials explicitly skip ordinary live tests. Configured-provider failures
  fail the run, including these environmental conditions:
  - quota exhaustion
  - billing/credit issues
  - model availability mismatches
  - inference provider availability
- OpenAI and DeepSeek are currently the strongest live verification paths in this repo.

## Provider certification

Provider support claims should follow the certification process in [`docs/provider-certification.md`](provider-certification.md).

In practice:

- unit tests establish contract verification
- live tests establish smoke verification
- maintained runtime demos or end-to-end flows establish runtime verification

Do not treat a passing mocked adapter test as equivalent to live or runtime verification.
