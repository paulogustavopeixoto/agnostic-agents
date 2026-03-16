# Changelog

All notable changes to `agnostic-agents` should be documented in this file.

The format is intentionally simple:

## Unreleased

### Added

### Changed

### Fixed

### Removed

## 1.0.41

### Added

- runtime-backed workflow primitives with `Workflow`, `WorkflowStep`, `AgentWorkflowStep`, and `WorkflowRunner`
- run inspection, debug sinks, fallback routing, layer stores, and retriever abstractions in the public package surface
- maintained OpenAI runtime demo covering retrieval, approvals, tool execution, and workflow orchestration

### Changed

- upgraded the package from a `v1` agent toolkit to a `v2` runtime with runs, checkpoints, pause/resume, cancellation, approval gating, and structured events
- redesigned memory into layered conversation, working, profile, policy, and semantic stores
- upgraded retrieval to support provenance, reranking, retrievers, improved chunking, and grounded prompt formatting
- updated the README to document the current `v2` runtime surface and examples
- refined the roadmap `v3` direction around inspectability, replay, and general-purpose orchestration

### Fixed

- OpenAI adapter usage metadata now flows into run metrics
- run inspection now preserves zero-duration steps correctly
- runtime demo retrieval chunking now resolves paragraph chunks safely before indexing

## 1.0.40

### Added

- explicit runtime error classes exported from the package
- maintained local examples for tool, RAG, and combined RAG + tool flows
- unit, integration, live, coverage, and package-audit test entry points
- CI workflows for unit/integration and scheduled/manual live smoke tests
- release, testing, package-audit, and legacy-example audit documentation

### Changed

- unified the core tool/runtime contract across `Agent`, `Tool`, and `MissingInfoResolver`
- normalized adapter capability metadata through `BaseProvider`
- narrowed the published npm package surface to the maintained `v1` files
- updated the Gemini maintained example to use a current model id override path

### Fixed

- tool failures now propagate predictably instead of being converted into fake success-shaped results
- retrieval now augments agent prompts instead of bypassing tool execution
- multimodal prompt construction now awaits prompt resolution correctly
- `RAG` no longer requires `indexName` for the local in-memory vector store
- `chunkText` guards against invalid overlap/chunk-size combinations
- `ApiTool` tolerates a falsy `spec`
- adapters that rely on `retryManager` now receive it from `BaseProvider`

## 1.0.39

Current published version before the v1 closeout release.
