# Provider and Feature Support Matrix

This matrix summarizes the maintained provider surface in `agnostic-agents`.

Use it together with:

- [`docs/provider-compatibility.md`](provider-compatibility.md)
- [`docs/provider-certification.md`](provider-certification.md)

The goal is to answer two questions quickly:

1. which providers implement which capabilities in this repo
2. how strong the current support claim is

## Legend

- `yes`: supported by the adapter contract in this repo
- `no`: not supported by the adapter contract in this repo
- certification:
  - `L1`: Contract Verified
  - `L2`: Live Smoke Verified
  - `L3`: Runtime Verified

## Matrix

| Provider | Cert | Text | Tool calling | Embeddings | Image analysis | Image generation | Audio transcription | Audio generation | Video analysis | Video generation | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OpenAI | L3 | yes | yes | yes | yes | yes | yes | yes | no | no | strongest maintained runtime path in the repo |
| Gemini | L1 | yes | yes | yes | yes | no | no | no | yes | yes | live example verification currently blocked by provider quota |
| Anthropic | L2 | yes | yes | no | no | no | no | no | no | no | text + tool path only |
| Hugging Face | L2 | yes | yes | yes | yes | yes | no | no | yes | no | broader multimodal surface, but less runtime verification depth than OpenAI |
| DeepSeek | L2 | yes | yes | yes | no | no | no | no | no | no | strong text/tool/embedding smoke path |

## Interpretation

### Best-supported runtime path

If you want the strongest maintained path today, use:

- OpenAI for end-to-end runtime examples, replay, approvals, and inspection

### Good contract/live options with narrower surface

Use these when you want solid text/tool support but do not need the broadest
multimodal feature set:

- Anthropic
- DeepSeek

### Broad capability surface with caveats

Use these when you care about wider modality support, but check current repo
examples and account availability first:

- Gemini
- Hugging Face

## Scope note

This matrix reflects the package surface and maintained repo verification.

It does not guarantee:

- provider account access
- quota availability
- model availability in your region/account
- identical quality across providers

Those are operational concerns, not contract guarantees.
