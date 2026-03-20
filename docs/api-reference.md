# API Reference

This is the maintained high-level API reference for the public surface of `agnostic-agents`.

It is aligned with:

- [`index.d.ts`](../index.d.ts)
- the root package exports in [`index.js`](../index.js)

Use this document as the quick reference for the supported package surface.

## Core runtime

### `Agent`

Main runtime entry point for provider-backed execution.

Constructor:

- `new Agent(adapter, options?)`

Key options:

- `tools`
- `memory`
- `defaultConfig`
- `description`
- `rag`
- `runStore`
- `toolPolicy`
- `approvalInbox`
- `governanceHooks`
- `eventBus`
- `authContext`
- `resolveToolAuth`

Key methods:

- `run(input, config?)`
- `sendMessage(input, config?)`
- `resumeRun(runId, options?)`
- `pauseRun(runId, options?)`
- `cancelRun(runId, options?)`
- `branchRun(runId, options?)`
- `replayRun(runId, options?)`

### `Run`

Durable runtime record with messages, steps, events, checkpoints, tool calls, errors, and metrics.

Key methods:

- `setStatus(status)`
- `addMessage(message)`
- `addStep(step)`
- `updateStep(stepId, patch?)`
- `addToolCall(toolCall)`
- `addToolResult(toolResult)`
- `addError(error)`
- `addEvent(event)`
- `addCheckpoint(checkpoint)`
- `getCheckpoint(checkpointId?)`
- `createCheckpointSnapshot()`
- `branchFromCheckpoint(checkpointId?, options?)`
- `toJSON()`
- `Run.fromJSON(payload?)`

### `RunInspector`

Summary helper for a single run.

Key method:

- `RunInspector.summarize(run)`

### `RunTreeInspector`

Builds and renders parent/child run trees.

Key methods:

- `RunTreeInspector.build(runStore, options?)`
- `RunTreeInspector.render(tree, options?)`

### `IncidentDebugger`

Builds structured incident reports from stored runs.

Constructor:

- `new IncidentDebugger({ runStore })`

Key method:

- `createReport(runId, options?)`

### `BranchQualityAnalyzer`

Compares replay and branch outcomes to identify the strongest observed execution path.

Constructor:

- `new BranchQualityAnalyzer({ runStore? })`

Key methods:

- `compare(baselineRun, candidateRuns?)`
- `analyzeFamily(rootRunId)`

### `DistributedRecoveryPlanner`

Builds structured recovery plans from distributed incident state.

Constructor:

- `new DistributedRecoveryPlanner({ runStore })`

Key method:

- `createPlan(runId, options?)`

Returned plan fields include:

- `incidentType`
- `recoveryPolicy`
- `recommendedAction`
- `steps`

### `DistributedRecoveryRunner`

Executes safe runtime recovery actions from a distributed recovery plan.

Constructor:

- `new DistributedRecoveryRunner({ runStore, agentRuntime?, workflowRuntimes?, autoResumeBranch? })`

Key method:

- `executePlan(planOrRunId, options?)`

If a recovery action requires explicit approval and no approval is supplied, execution returns a `waiting_for_recovery_approval` result with `pendingApproval`.

### `TraceDiffer`

Compares two runs structurally.

Key method:

- `TraceDiffer.diff(leftRun, rightRun)`

### `TraceSerializer`

Portable trace export/import helper.

Static fields:

- `SCHEMA_VERSION`
- `RUN_FORMAT`
- `BUNDLE_FORMAT`

Key methods:

- `describeSchema()`
- `exportRun(run, metadata?)`
- `importRun(trace?)`
- `exportPartialRun(run, options?)`
- `exportBundle(runs?, metadata?)`
- `importBundle(bundle?)`
- `validateTrace(trace?, options?)`

## Governance and controls

### `Tool`

Canonical tool definition used across providers and runtime execution.

Constructor:

- `new Tool(definition)`

Key methods:

- `call(args?, context?)`
- `toUnifiedSchema()`
- `toOpenAIFunction()`
- `toAnthropicTool()`

### `ToolPolicy`

Policy layer for tool execution.

Constructor:

- `new ToolPolicy(options?)`

Key methods:

- `evaluate(tool, context?)`
- `verify(tool, context?)`

Common uses:

- allowlists/denylists
- approval gating
- rule-based control of side-effecting tools

### `ApprovalInbox`

Simple approval storage surface.

Constructor:

- `new ApprovalInbox(options?)`

Key methods:

- `add(request)`
- `get(id)`
- `list()`
- `resolve(id, resolution)`

### `GovernanceHooks`

Callback surface for policy, approval, verifier, and terminal run events.

Constructor:

- `new GovernanceHooks(options?)`

Key method:

- `dispatch(type, payload?, context?)`

### `EventBus`

Runtime event distribution for sinks and integrations.

Constructor:

- `new EventBus(options?)`

Key methods:

- `addSink(sink)`
- `emit(event, run?)`

### `ConsoleDebugSink`

Debug sink for structured runtime events.

### `FileAuditSink`

JSONL audit sink for side-effecting runtime events.

### `RuntimeEventRedactor`

Shared redaction helper for maintained sinks and custom logging pipelines.

## Orchestration and planning

### `Workflow`

Maintained workflow definition surface.

Constructor:

- `new Workflow(options?)`

Key method:

- `toExecutionGraph()`

### `WorkflowStep`

Base workflow step type.

### `AgentWorkflowStep`

Workflow step wrapper for delegated agent execution.

### `ExecutionGraph`

Dependency graph derived from a workflow.

### `DelegationContract`

Structured contract for delegated agent work.

### `WorkflowRunner`

Workflow runtime with pause/resume/branch/replay support.

Constructor:

- `new WorkflowRunner(options)`

Key methods:

- `run(input?, options?)`
- `resumeRun(runId, options?)`
- `cancelRun(runId, options?)`
- `branchRun(runId, options?)`
- `replayRun(runId, options?)`

### `DelegationRuntime`

Host-controlled multi-agent delegation helper.

Key method:

- `delegate(options)`

### `PlanningRuntime`

Plan, verify, recover runtime.

Constructor:

- `new PlanningRuntime(options)`

Key method:

- `run(input, options?)`

### `BackgroundJobScheduler`

Recurring and delayed job scheduler with pluggable storage.

Constructor:

- `new BackgroundJobScheduler(options?)`

Key methods:

- `registerHandler(name, handler)`
- `schedule(job)`
- `get(jobId)`
- `runDueJobs(now?)`
- `list()`

## Storage contracts

### `BaseRunStore`

Contract for persisted run storage.

Key methods:

- `saveRun(run)`
- `getRun(runId)`
- `listRuns()`
- `BaseRunStore.assert(store, name?)`

### `BaseJobStore`

Contract for persisted job storage.

Key methods:

- `saveJob(job)`
- `getJob(jobId)`
- `listJobs()`
- `BaseJobStore.assert(store, name?)`

### `BaseLayerStore`

Contract for layered memory storage.

Key methods:

- `get(key)`
- `set(key, value)`
- `delete(key)`
- `entries()`
- `clear()`
- `BaseLayerStore.assert(store, name?)`

### Maintained built-in stores

- `InMemoryRunStore`
- `FileRunStore`
- `InMemoryJobStore`
- `FileJobStore`
- `InMemoryLayerStore`
- `FileLayerStore`

### `StorageBackendRegistry`

Registry for named run/job/layer stores.

Key methods:

- `registerRunStore(name, store)`
- `registerJobStore(name, store)`
- `registerLayerStore(name, store)`
- `getRunStore(name)`
- `getJobStore(name)`
- `getLayerStore(name)`
- `list()`

## Memory and retrieval

### `Memory`

Layered memory abstraction for working, profile, policy, conversation, and semantic context.

### `RAG`

Retrieval helper for indexing and querying grounded context.

Key methods:

- `index(input, metadata?)`
- `retrieve(query, options?)`

### `LocalVectorStore`

Built-in vector store for local retrieval workflows.

### `BaseRetriever`

Retriever contract.

### `VectorStoreRetriever`

Retriever backed by a vector store.

## Evaluation and evidence

### `EvidenceGraph`

Evidence graph for retrieval and tool-result grounding.

Key methods:

- `addNode(node)`
- `addEdge(edge)`
- `detectConflicts()`
- `summarize()`

### `EvalHarness`

Evaluation runner for scenario-based checks.

### `LearningLoop`

Records runs, evaluation summaries, and structured feedback for operational learning signals.

Key methods:

- `recordRun(run)`
- `recordEvaluation(report)`
- `recordFeedback(item)`
- `summarize()`
- `buildRecommendations()`
- `buildAdaptiveRecommendations()`

### `PolicyTuningAdvisor`

Converts replay, eval, and learning-loop signals into operator-facing policy suggestions.

Key method:

- `buildSuggestions(options?)`

### `VerifierEnsemble`

Composes multiple reviewers into a single verifier decision.

Key method:

- `verify(tool, args, context?)`

### `ConfidencePolicy`

Applies explicit confidence thresholds to risky tool calls and weak final outputs.

Key methods:

- `evaluateTool(tool, toolAssessment, context?)`
- `evaluateRun(run, assessment, context?)`

### `AdaptiveRetryPolicy`

Turns prior failures and eval pressure into retry-versus-escalation decisions.

Key method:

- `onFailure(error, options?)`

### `HistoricalRoutingAdvisor`

Ranks providers using accumulated routing outcomes and optional learning-loop pressure.

Key methods:

- `recordOutcome(outcome?)`
- `rankProviders(providers, options?)`

### `AdaptiveDecisionLedger`

Records adaptive suggestions and decisions with replay and rollback metadata.

Key methods:

- `recordSuggestion(suggestion, metadata?)`
- `recordDecision(decision, metadata?)`
- `summarize()`
- `exportReplay(entryId)`
- `buildRollbackPlan(entryId)`

### `AdaptiveGovernanceGate`

Ensures material adaptive changes follow approval and governance review paths before application.

Key methods:

- `evaluate(entry, context?)`
- `reviewSuggestion(suggestion, metadata?)`
- `reviewDecision(decision, metadata?)`
- `resolveReview(reviewId, resolution?)`

## Environment and provider adapters

### Environment adapters

- `BaseEnvironmentAdapter`
- `BrowserEnvironmentAdapter`
- `ShellEnvironmentAdapter`
- `ApiEnvironmentAdapter`
- `QueueEnvironmentAdapter`
- `FileEnvironmentAdapter`

### Provider and integration surfaces

- `OpenAIAdapter`
- `GeminiAdapter`
- `AnthropicAdapter`
- `HFAdapter`
- `DeepSeekAdapter`
- `FallbackRouter`
- `MCPClient`
- `MCPTool`
- `MCPDiscoveryLoader`
- `OpenAPILoader`
- `ApiLoader`
- `CurlLoader`
- `PostmanLoader`

## Utilities and errors

### Utilities

- `RetryManager`
- `chunkText(input, options?)`
- `repairJsonOutput(input)`
- `encodeBase64(input)`

### Error hierarchy

- `AgentError`
- `AdapterCapabilityError`
- `InvalidToolCallError`
- `ToolNotFoundError`
- `ToolExecutionError`

## Compatibility notes

- `Task` and `Orchestrator` remain exported for compatibility
- the maintained orchestration path is `Workflow` and `WorkflowRunner`
- the maintained runtime-control path is `Agent.run()` with `Run`, traces, replay, governance, and inspection surfaces
