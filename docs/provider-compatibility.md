# Provider Compatibility

This document describes the normalized adapter contract and current certification status in `agnostic-agents`.

For how certification levels are defined, see [`docs/provider-certification.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/provider-certification.md).
For minimal setup snippets, see [`docs/provider-quickstarts.md`](/Users/paulopeixoto/Desktop/PauloRepos/agnostic-agents/agnostic-agents/docs/provider-quickstarts.md).

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
- Video generation: yes

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

- Tool-calling payloads are normalized to `{ message, toolCalls }`.
- Unsupported optional methods should be treated as capability-checked operations, not runtime surprises.
- Live availability can still depend on provider account state, quota, and model access.
- Certification levels should be updated only after the corresponding test and docs workflow is completed.
