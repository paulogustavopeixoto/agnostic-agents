# Examples

## Maintained v1 examples

These examples are aligned with the current public API and should be treated as the supported starting points.

- `openaiExample.js`
  - requires `OPENAI_API_KEY`
  - provider-backed tool example
- `geminiExample.js`
  - requires `GEMINI_API_KEY`
  - provider-backed tool example
- `localToolExample.js`
  - no API key required
  - local tool loop demo
- `localRagExample.js`
  - no API key required
  - local retrieval demo
- `localRagToolExample.js`
  - no API key required
  - combined retrieval + tool demo
- `openaiRuntimeDemo.js`
  - requires `OPENAI_API_KEY`
  - advanced runtime demo for `v2`
- `openaiV3RuntimeDemo.js`
  - requires `OPENAI_API_KEY`
  - advanced runtime-OS demo for `v3`
- `openaiV4RuntimeDemo.js`
  - requires `OPENAI_API_KEY`
  - advanced runtime-control demo for `v4`

## Maintained v4 reference integrations

These examples are intended as reference deployment patterns rather than feature walkthroughs.

- `referenceExpressRuntimeServer.js`
  - requires `OPENAI_API_KEY`
  - shows how to expose runtime-backed runs over HTTP with approvals and inspection
- `referenceQueueWorker.js`
  - no API key required
  - shows queue-based distributed continuation where one process creates a run and a worker process consumes a handoff envelope from a shared queue
- `referenceIncidentDebug.js`
  - no API key required
  - shows how to inspect stored runs and export a portable trace bundle
- `referenceOperatorWorkflow.js`
  - no API key required
  - shows common operator tasks: run tree inspection, incident reporting, trace diffing, and partial trace export
- `referenceEvalBenchmarks.js`
  - no API key required
  - shows maintained eval categories: prompt regression, tool selection accuracy, and RAG grounding
- `referenceReplayBenchmarks.js`
  - no API key required
  - shows replay-based runtime regression checks over stored runs
- `referenceOpenApiImport.js`
  - no API key required
  - shows importing a small OpenAPI spec into runtime tools
- `referenceDurableBackends.js`
  - no API key required
  - shows custom durable run/job/layer store implementations and registry usage
- `referenceDistributedHandoff.js`
  - no API key required
  - shows a run created in one process and continued in another through a shared run store and distributed handoff envelope
- `referenceDistributedIncident.js`
  - no API key required
  - shows distributed incident reconstruction with correlation metadata, incident reports, and portable trace export

## Legacy / advanced examples

The remaining files in this folder are historical or advanced experiments. They are not part of the maintained `v1` surface and may depend on integrations, models, or internal modules that are not yet stabilized.
