# Testing Guide

## Test commands

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:live
npm run test:coverage
npm run test:all
```

## Test groups

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

Test credentials should follow the baseline secret guidance in [`docs/secret-handling.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/secret-handling.md).
For tools that need host-supplied credentials, follow the auth propagation model in [`docs/tool-auth-propagation.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/tool-auth-propagation.md).

In practice:

- keep live keys in `.env` or the process environment only
- never commit test credentials or provider cookies
- use fake tokens and placeholder secrets in fixtures
- avoid logging raw credential material in test helpers or debug output

## Notes on live tests

- Live tests are smoke tests, not exhaustive provider certification.
- Some provider/account conditions are treated as skippable:
  - quota exhaustion
  - billing/credit issues
  - model availability mismatches
  - inference provider availability
- OpenAI and DeepSeek are currently the strongest live verification paths in this repo.

## Provider certification

Provider support claims should follow the certification process in [`docs/provider-certification.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/provider-certification.md).

In practice:

- unit tests establish contract verification
- live tests establish smoke verification
- maintained runtime demos or end-to-end flows establish runtime verification

Do not treat a passing mocked adapter test as equivalent to live or runtime verification.
