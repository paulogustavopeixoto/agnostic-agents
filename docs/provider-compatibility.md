# Provider Compatibility

This document describes the normalized adapter contract in `agnostic-agents` as of `v2`.

## Shared contract

All maintained adapters expose:

- `generateText()`
- `getCapabilities()`
- `supports(capability)`

Optional methods are governed by capability flags and should throw `AdapterCapabilityError` when unsupported.

## Capability summary

### OpenAIAdapter

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
