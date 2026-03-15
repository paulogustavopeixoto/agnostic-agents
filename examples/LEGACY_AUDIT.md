# Legacy Example Audit

This file records the status of non-maintained examples in `examples/`.

## Maintained v1 examples

These are the examples users should rely on:

- `openaiExample.js`
- `geminiExample.js`
- `localToolExample.js`
- `localRagExample.js`
- `localRagToolExample.js`

## Legacy or experimental examples

These files are not part of the maintained v1 surface.

### Stale contract examples

These reference older module paths, older tool registries, missing integrations, or assumptions that no longer match the current public API.

- `agentWithHybridMemory.js`
- `agentWithMultipleToolsAndMemory.js`
- `agentWithRegistry.js`
- `agentWithResolver.js`
- `agentPlannerExample.js`
- `ToolValidatorTest.js`
- `piecesTest.js`
- `MCPDiscoveryLoaderExample.js`
- `openApiExample.js`

### Provider demos that are broader than the maintained v1 surface

These are useful reference material but are not guaranteed as supported examples because they mix optional or uneven capabilities.

- `anthropicExample.js`
- `deepseekExample.js`
- `huggingFaceExample.js`
- `ragExample.js`
- `useRagExample.js`
- `pineconeExample.js`
- `jsonRepairExample.js`

## Recommendation

Do not promote the legacy examples in the README or npm scripts until each one is migrated to the current public API and verified.
