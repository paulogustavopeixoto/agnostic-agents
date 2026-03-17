# Community Summaries

This page is the short public summary of compatibility and benchmark posture for
`agnostic-agents`.

Use it when you want a quick answer to:

- what is strongly supported today
- where the package has the deepest verification
- what is still intentionally partial

For detailed source material, use the linked docs beneath each section.

## Compatibility summary

### Strongest maintained path

- OpenAI is the strongest end-to-end maintained provider path in the repo
- the runtime has maintained examples for approvals, replay, lineage, and
  inspection
- public runtime-control examples are deepest on this path

### Strong contract/live paths

- Anthropic and DeepSeek are strong text/tool-focused paths
- they are good options when you want normalized provider support without the
  broadest multimodal expectations

### Broad capability paths with caveats

- Gemini and Hugging Face expose broader modality coverage in this repo
- their practical verification depth is narrower than the strongest OpenAI path
- operational caveats such as quota or account availability still matter

For the full table, see:

- [Support matrix](support-matrix.md)
- [Provider certification](provider-certification.md)
- [Provider compatibility](provider-compatibility.md)

## Benchmark summary

The repo now maintains benchmark and eval coverage for:

- prompt regression
- tool selection accuracy
- RAG grounding
- replay-based regression
- adaptive decision checks
- worker-coordination checks
- coordination benchmarks

These benchmarks are aimed at runtime behavior, not leaderboard marketing.

That means the maintained benchmark story is strongest for:

- replay and regression safety
- governance and approval behavior
- lineage and delegated worker integrity
- coordination quality over fixed scenarios

For the detailed benchmark discipline, see:

- [Benchmarking](benchmarking.md)

## Ecosystem summary

The public ecosystem surfaces are now strongest in these areas:

- provider adapter compatibility and certification
- extension authoring through `ExtensionHost`
- reference deployment integrations
- public control-plane and visualization references
- coordination-layer primitives above the runtime

Still intentionally maturing:

- broader third-party adapter/backend certification coverage
- community-facing ecosystem rollups beyond the shipped docs
- external adoption summaries beyond repo-maintained references

## Recommended reading order

If you are evaluating the package quickly:

1. read [README.md](../README.md)
2. read [Support matrix](support-matrix.md)
3. read [Community roadmap status](community-roadmap-status.md)
4. read [Reference integrations](reference-integrations.md)
5. read [Benchmarking](benchmarking.md)
