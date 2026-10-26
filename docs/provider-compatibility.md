# Provider Compatibility

This document describes the normalized adapter contract and current certification status in `agnostic-agents`.

For how certification levels are defined, see [`docs/provider-certification.md`](provider-certification.md).
For minimal setup snippets, see [`docs/provider-quickstarts.md`](provider-quickstarts.md).
For the concise provider/feature matrix, see [`docs/support-matrix.md`](support-matrix.md).

Certification labels below are the historical repository baseline. Current-update
live revalidation is pending; see [initial targets](initial-support-targets.md).

## Shared contract

All maintained adapters expose:

- `generateText()`
- `getCapabilities()`
- `supports(capability)`

Optional methods are governed by capability flags and should throw `AdapterCapabilityError` when unsupported.

## Capability summary

### OpenAIAdapter

- Certification: `Level 3 - Runtime Verified`

- Text generation: yes
- Tool calling: yes
- Embeddings: yes
- Image analysis: yes
- Image generation: yes
- Audio transcription: yes
- Audio generation: yes
- Video analysis: no
- Video generation: no

### GeminiAdapter

- Certification: `Level 1 - Contract Verified`

- Text generation: yes
- Tool calling: yes
- Embeddings: yes
- Image analysis: yes
- Image generation: no
- Audio transcription: no
- Audio generation: no
- Video analysis: yes
- Video generation: no (unavailable on the bundled adapter SDK path)

### AnthropicAdapter

- Certification: `Level 2 - Live Smoke Verified`

- Text generation: yes
- Tool calling: yes
- Embeddings: no
- Image analysis: no
- Image generation: no
- Audio transcription: no
- Audio generation: no
- Video analysis: no
- Video generation: no

### HFAdapter

- Certification: `Level 2 - Live Smoke Verified`

- Text generation: yes
- Tool calling: yes
- Embeddings: yes
- Image analysis: yes
- Image generation: yes
- Audio transcription: no
- Audio generation: no
- Video analysis: yes
- Video generation: no

### DeepSeekAdapter

- Certification: `Level 2 - Live Smoke Verified`

- Text generation: yes
- Tool calling: yes
- Embeddings: yes
- Image analysis: no
- Image generation: no
- Audio transcription: no
- Audio generation: no
- Video analysis: no
- Video generation: no

## Notes

### Additional Chat Adapters

MistralAdapter and XAIAdapter now implement the explicit-model chat/tool compatibility
contract, including normalized tool calls, usage, incomplete results and signal
propagation. Their other BaseProvider capabilities are false and inherited unsupported
methods reject. Contract tests pass; no new live certification is claimed.

### Media Producers And Backends

ElevenLabsProducer provides bounded MP3 speech with a host artifact callback.
FalJobBackend and HiggsfieldJobBackend provide image/video submission and polling for
ProducerJobRunner, not BaseProvider text adapters. Live smoke is available behind
explicit gates but has not run here. See [integration targets](initial-support-targets.md)
for the ten-provider catalog, vector-store adapters, limits and configuration.

## Shared Notes

- Tool-calling payloads are normalized to `{ message, toolCalls }`.
- Unsupported optional methods should be treated as capability-checked operations, not runtime surprises.
- Live availability can still depend on provider account state, quota, and model access.
- Certification levels should be updated only after the corresponding test and docs workflow is completed.
