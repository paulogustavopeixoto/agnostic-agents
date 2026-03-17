# Changelog

All notable changes to `agnostic-agents` should be documented in this file.

The format is intentionally simple:

## Unreleased

### Added

### Changed

### Fixed

### Removed

## 1.1.0

### Added

- `v6` distributed-runtime surfaces including `DistributedRunEnvelope`, remote continuation APIs, queue/service handoff references, distributed incident reconstruction, trace correlation, distributed recovery planning/execution, remote control-plane integrations, and execution identity propagation
- `v7` adaptive-runtime surfaces including `BranchQualityAnalyzer`, `PolicyTuningAdvisor`, `VerifierEnsemble`, `ConfidencePolicy`, `AdaptiveRetryPolicy`, `HistoricalRoutingAdvisor`, `AdaptiveDecisionLedger`, and `AdaptiveGovernanceGate`
- maintained adaptive benchmark coverage and audit examples including `referenceAdaptiveBenchmarks.js` and `referenceV7Audit.js`

### Changed

- promoted the package from the `1.0.x` maturity line to `1.1.0` now that the distributed execution baseline and adaptive runtime layers are implemented, documented, and tested as maintained surfaces
- updated the README and roadmap to reflect the current `v7` scope and the completed `v6` and `v7` milestones
- expanded the maintained examples and docs around distributed execution, remote governance, adaptive runtime behavior, and end-to-end audit verification

### Fixed

- release metadata and scope documentation now align with the shipped distributed-runtime and adaptive-runtime capabilities instead of stopping at older phase labels

## 1.0.44

### Added

- `v5` production-maturity documentation including API reference, migration guides, API stability policy, provider quickstarts, secret handling, tool auth propagation, operator workflows, operator architecture, benchmarking guidance, benchmark fixtures, storage backend guidance, MCP interoperability, OpenAPI examples, and cookbook patterns
- maintained operator, eval, replay-benchmark, OpenAPI import, and durable-backend reference examples
- governance hardening surfaces including `FileAuditSink`, `RuntimeEventRedactor`, tool allowlist/blocklist controls, and host-controlled tool auth propagation
- baseline eval coverage for prompt regression, tool selection accuracy, RAG grounding, replay regression, and framework-comparison fixture validation

### Changed

- completed the `v5` roadmap around operator experience, durability guidance, governance maturity, public contract clarity, and benchmark discipline
- expanded the published package surface to include the new maintained `v5` docs and reference examples
- normalized public JSDoc across the maintained runtime-control classes so the source-level contract is easier to follow

### Fixed

- package docs and roadmap now align with the current `v5` runtime maturity surface instead of stopping at the earlier `v4` baseline

## 1.0.43

### Added

- `v4` runtime-control surfaces including `RunTreeInspector`, `TraceDiffer`, `IncidentDebugger`, `GovernanceHooks`, `ExtensionHost`, `StorageBackendRegistry`, portable trace bundles, and published TypeScript declarations
- maintained `openaiV4RuntimeDemo.js` covering approval gating, branching, frozen replay, run trees, incident debugging, trace export, governance hooks, and scheduling
- reference integration examples and deployment guidance for API server, queue worker, and offline incident debugging flows
- provider certification documentation and certification levels for maintained adapters

### Changed

- completed the `v4` runtime-OS baseline around runtime control, portability, storage contracts, trace portability, extension model, and deployment references
- updated the README and examples docs to reflect the current `v4` runtime surface and reference integration paths
- normalized partial frozen replay so checkpoint-based replay pauses intentionally as an inspection/restart surface rather than appearing still active
- improved run-tree rendering and ordering so inspection output reflects execution order more clearly

### Fixed

- `v4` OpenAI demo now completes the incident-debugging section instead of aborting on the intentional planning failure
- `v4` workflow demo prompts are constrained to real shipped runtime-control capabilities instead of generic invented platform features
- stale documentation references to older runtime phases were cleaned up across the README and examples

## 1.0.42

### Added

- `v3` runtime-OS primitives including `DelegationRuntime`, `PlanningRuntime`, `LearningLoop`, persistent job stores, and environment adapters
- `openaiV3RuntimeDemo.js` to exercise replay-oriented runtime behavior, approvals, delegation, planning recovery, scheduling, evals, and learning signals
- run assessment with uncertainty/confidence scoring, tool-confidence scoring, self-verification, and stronger evidence conflict detection

### Changed

- completed the `v3` roadmap around inspectability, replay, governance, delegation, planning/recovery, scheduling, and runtime-OS positioning
- upgraded self-verification so analytical outputs are not falsely flagged for approval and completed tool actions are verified in context
- extended `BackgroundJobScheduler` into a persistent recurring scheduler with handler registration and job stores

### Fixed

- `v3` OpenAI demo now separates conflict analysis from approval-gated tool execution so both paths are exercised deterministically
- evidence conflict detection now catches stronger subject/predicate contradictions such as readiness vs not-ready claims
- workflow child-run metrics, verifier timing, and inspection outputs now reflect the newer runtime surfaces consistently

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
