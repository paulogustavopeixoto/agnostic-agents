# Changelog

All notable changes to `agnostic-agents` should be documented in this file.

The format is intentionally simple:

## Unreleased

### Added

- `v19` Budgeted Autonomy OS maintained surfaces including `AutonomyBudget`, `AutonomyBudgetLedger`, `UncertaintySupervisionPolicy`, `ApprovalDelegationContract`, `AutonomyEnvelope`, `AutonomyPolicyRegistry`, `InterventionPolicyRegistry`, `ApprovalDecisionCache`, `WorkflowSupervisionCheckpoint`, `ProgressiveAutonomyController`, `AutonomyBenchmarkSuite`, `AutonomyFleetSummary`, and `AutonomyRolloutGuard`
- `v20` Enterprise Autonomy OS maintained surfaces including `UnifiedExecutionGraph`, `EnterpriseAutonomyArchitecture`, `EnterpriseOperatingModel`, `AutonomyStackConfig`, `AutonomyStackComparator`, `AutonomyDriftGuard`, `OperationalScorecard`, `EnterpriseAutonomyBenchmarkSuite`, `DeploymentPatternCertificationKit`, `EnterpriseBoundaryProfile`, and `TransactionalExecutionPlan`
- maintained enterprise-operating-layer examples and docs including deployment-pattern certification, enterprise boundaries, transactional execution, enterprise autonomy architectures, operational scorecards, coordination safety, and AI operating-layer guidance

### Changed

- updated the README, roadmap status, and reference integration docs so the current package state reflects maintained autonomy-operating-layer surfaces through `v20` core instead of describing that horizon as purely future work

### Fixed

- public maturity guidance now distinguishes completed `v20` operating-layer core from the remaining refinement work, reducing roadmap/status drift in release-facing docs

### Removed

- none yet

## 1.3.3 - 2026-03-20

### Added

- API/bootstrap utility surfaces including `CurlLoader`, `PostmanLoader`, `SecretResolver`, `SchemaNormalizer`, `ToolRecorder`, `ToolMockBuilder`, `ToolSandboxRunner`, `PromptArtifact`, `PromptRegistry`, `RunRecipe`, `WorkflowPreset`, `IncidentBundleExporter`, `CredentialDelegationKit`, and `RoutePolicySimulator`
- maintained import and smoke examples including `referenceCurlImport.js`, `referenceUtilityToolkit.js`, and `referenceEverythingSmoke.js`
- `v18` Memory Governance OS maintained surfaces including `MemoryProvenanceLedger`, `MemoryRetentionPolicy`, `MemoryAccessController`, `MemoryConflictResolver`, `MemoryAccessContractRegistry`, `MemoryAuditView`, `MemoryGovernanceBenchmarkSuite`, `MemoryGovernanceDiagnostics`, and `MemoryGovernanceReviewWorkflow`
- maintained memory-governance examples and docs including `referenceMemoryGovernance.js`, `referenceMemoryGovernanceReview.js`, and memory governance/state governance documentation

### Changed

- extended `Memory` so governance records, retention rules, access controls, conflict handling, and governed state export are part of the maintained memory surface
- extended portable state bundles to carry memory governance payloads, access-contract summaries, and stricter memory/state consistency checks
- updated README, API reference, examples, and roadmap status so the current package reflects the utility layer and completed `v18` memory-governance baseline

### Fixed

- `OpenAPILoader` now preserves path/query/header routing correctly, validates missing path params, and uses a stable `axios.request(...)` path for testability
- `MCPDiscoveryLoader` and `MCPTool` now preserve prefixed local tool names without breaking remote MCP execution names
- loader regression coverage now catches path/header leakage, curl auth formatting, MCP remote-name drift, and stricter governed-memory state-bundle consistency

## 1.3.2 - 2026-03-19

### Added

- `v13` Learning OS maintained surfaces including `LearnedAdaptationArtifact`, `ImprovementProposalEngine`, `ImprovementActionPlanner`, `GovernedImprovementLoop`, `AdaptationPolicyEnvelope`, `ImprovementEffectTracker`, `LearningBenchmarkSuite`, and `AdaptationRegressionGuard`
- `v14` Fleet OS maintained surfaces including `FleetRolloutPlan`, `FleetHealthMonitor`, `FleetCanaryEvaluator`, `FleetSafetyController`, `FleetImpactComparator`, and `FleetRollbackAdvisor`
- `v15` Assurance OS maintained surfaces including `InvariantRegistry`, `AssuranceReport`, `AssuranceSuite`, `AssuranceGuardrail`, and `AssuranceRecoveryPlanner`
- `v16` Operator OS maintained surfaces including `OperatorSummary`, `OperatorInterventionPlanner`, `OperatorTriageWorkflow`, `GovernanceRecordLedger`, `AuditStitcher`, `GovernanceTimeline`, `OperatorDashboardSnapshot`, and `OperatorControlLoop`
- maintained operator-facing docs and examples covering governance timelines, day-2 guidance, rollout/incident/adaptation review checklists, and operator dashboard/control-loop references

### Changed

- updated the roadmap, README, examples, and community roadmap status so the current package state reflects maintained surfaces through `v16` instead of stopping at earlier roadmap phases
- expanded the published package surface to include fleet, assurance, and operator docs/examples needed to use the current release line coherently

### Fixed

- operator reference examples now use the actual `RunTreeInspector` static API instead of stale instance-method assumptions
- roadmap and community status docs now align with the completed `v14` to `v16` baselines instead of leaving stale unchecked items behind

### Removed

- none

## 1.3.1

### Added

- `v11` Interop OS surfaces including `ExtensionManifest`, `ConformanceKit`, `ArtifactCompatibilitySuite`, `InteropContractValidator`, `CertificationKit`, `CompatibilitySummary`, `ToolSchemaArtifact`, and `InteropArtifactRegistry`
- `v12` Coordination OS surfaces including role-aware coordination, richer disagreement and trust handling, multi-pass coordination verification, coordination-quality tracking, deeper coordination benchmarks, and operator-facing coordination diagnostics
- maintained interop and advanced coordination reference examples covering manifests, artifact compatibility, external validation, certification, shared interop registry, role-aware coordination, advanced disagreement handling, coordination verification, coordination quality, and coordination diagnostics
- public interop and coordination documentation covering artifact registry usage, schema evolution, contract validation, certification kits, role-aware coordination, advanced disagreement handling, coordination verification, coordination quality, and coordination diagnostics

### Changed

- expanded the public package surface from the `1.3.0` policy/state baseline into completed `v11` and `v12` maintained surfaces
- updated the roadmap and README so the current package state reflects completed Policy OS, State OS, Interop OS, and Coordination OS foundations instead of stopping at the earlier forward-path framing
- deepened the maintained coordination benchmark coverage to include disagreement, recovery, role routing, decomposition failures, and trust-assumption scenarios

### Fixed

- critique-schema overlays now merge task-family, risk-class, and artifact-type defaults without wiping prior taxonomy values
- maintained coordination examples now preserve the richer task/risk/artifact context through the full coordination loop instead of losing it after the initial review step
- release metadata now matches the shipped interop and coordination public surface for the `1.3.1` line

## 1.3.0

### Added

- `v9` Policy OS core surfaces including portable `PolicyPack` artifacts, `PolicySimulator`, `PolicyEvaluationRecord`, `PolicyScopeResolver`, `PolicyLifecycleManager`, `ApprovalEscalationPolicySuite`, `RecoveryPolicyGate`, `CompensationPolicyPlanner`, and coordination-policy gating
- `v10` State OS core surfaces including `StateBundle`, `StateDiff`, `StateBundleSerializer`, `StateContractRegistry`, `StateIntegrityChecker`, `StateConsistencyChecker`, `StateRestorePlanner`, `StateDurableRestoreSuite`, and `StateIncidentReconstructor`
- maintained policy and state reference examples covering policy simulation, policy inheritance, policy lifecycle, approval/escalation policy rehearsal, recovery policy gating, compensation policy planning, portable state bundles, restore planning, durable restore scenarios, and offline incident reconstruction
- state-oriented documentation including policy OS, state OS, state restore, durable restore, and state incident reconstruction guidance

### Changed

- promoted the package from `1.2.x` to `1.3.0` now that the maintained `v9 Policy OS` core and `v10 State OS` core are part of the public package surface
- updated the README and roadmap-facing public docs so they reflect the current package more accurately: runtime OS foundation, coordination layer above it, completed policy/state cores, and `v11+` as the forward path
- expanded the published package surface to include the maintained policy and state documentation needed to use the current release line correctly

### Fixed

- maintained state examples now preserve portable job metadata and align working-memory context with restored run intent, avoiding misleading consistency warnings
- public docs no longer describe `v10` as only an initial slice now that the concrete `v10` checklist is effectively complete
- release-facing package metadata is aligned with the current policy/state public surface

## 1.2.0

### Added

- a maintained coordination layer above the runtime including `CritiqueProtocol`, `CritiqueSchemaRegistry`, `TrustRegistry`, `DisagreementResolver`, `CoordinationLoop`, `DecompositionAdvisor`, and `CoordinationBenchmarkSuite`
- maintained coordination, worker-coordination, production-policy-pack, runtime-extension, file-backed-stack, and public-control-plane reference examples
- dynamic policy mutation helpers on `ToolPolicy` plus a maintained `ProductionPolicyPack` for extension-hosted policy and governance presets
- public ecosystem guidance including the support matrix, ecosystem certification guidance, community summaries, community roadmap status, public control-plane references, and run/trace visualization references

### Changed

- promoted the package from `1.1.x` to `1.2.0` now that the coordination layer, public ecosystem references, and release-facing package/docs surface are all maintained
- rewrote the README so the package entry point explains the runtime OS, the coordination layer above it, maintained starting paths, provider guidance, and deployment/control-plane references more clearly
- expanded the published package surface to include the new ecosystem, control-plane, visualization, and community-status documentation
- completed the remaining `v8+` public ecosystem documentation items in the roadmap

### Fixed

- maintained deployment and control-plane examples now align with the real runtime message format for tool results, preventing duplicate approval loops after resume
- the file-backed stack reference no longer implies unsupported `Agent` options and now reflects the actual integration boundary more accurately
- package docs, examples, and roadmap status are more internally consistent about current capabilities and maintained reference paths

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
