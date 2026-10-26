# Package Review Findings

Review date: 2026-10-23. Scope: the current dirty working tree, package 1.3.3.
This is a first-party, risk-focused code review, not an independent security audit
or proof that every module, provider or deployment is safe. No runtime source was
changed during this review. All reproductions used synthetic data and mocked
providers/transports or local temporary files; no paid API calls were made.

P1 means fix before relying on the affected security/reliability guarantee.
P2 means a confirmed correctness defect with narrower triggering conditions.
The final two findings were already reported in the preceding storage review.

## Resolution - 1.3.4

R01-R14 have implementation fixes and regression tests in
tests/review-regressions.unit.test.js. The original findings below are retained as
the review record, not a statement that they remain open in 1.3.4. The tests cover
denied verifier/repair dispatch, timeouts, unsafe video imports, remote-tool
approval defaults, terminal/governed fallback, retry/signal accounting, native
provider messages, truncation, local/file workflow ownership, memory/file job
claims, interrupt/close races, ingestion identities and vector snapshot integrity.
See security-release-migration.md for host responsibilities and behavioral changes.
This resolution is engineering evidence, not independent security certification.
Verification for the resolution: 25 review regressions pass; the full foundation
run passes 491 tests with 14 live tests skipped, followed by TypeScript checks and
the scoped multimodal example. Dependency audit reports zero advisories after the
OpenAI SDK/Zod update. The historical 466-test baseline below predates these fixes.

## R01 [P1] Verifier Model Calls Bypass Agent Egress Authorization

Location: src/agent/Agent.js:1526 and the JSON-repair call at 1534.

The model-backed verifier receives tool arguments, run input, prior tool results
and pending approvals without consulting authorizeModelCall. Its call and repair
call also lack the main model dispatch deadline and per-call execution reservation.
A runTool test with authorizeModelCall returning false still completed, sent one
request to the verifier, and invoked the authorization hook zero times.

Fix: route verifier and repair requests through the same authorization, signal,
deadline, accounting and reservation boundary as main model dispatch. Test that
denied egress sends no arguments, input or tool results to any model-backed helper.

## R02 [P1] Legacy Hugging Face Video Imports Permit Internal-Network Egress

Location: src/llm/huggingFace.js:206.

analyzeVideo fetches arbitrary HTTP URLs with default redirect behavior and reads
the entire response using arrayBuffer, then uploads those bytes to the provider.
It also accepts local video paths without an artifact authorization boundary.
If an application exposes this input to untrusted users, it permits SSRF and
internal data disclosure; there is no byte ceiling or propagated cancellation.

Reproduction: a mocked fetch accepted an HTTP link-local metadata-address URL and
the next mocked provider request contained the synthetic internal response bytes.
No internal endpoint was actually contacted.

Fix: resolve authorized, tenant-scoped artifact references through host storage;
otherwise require an explicit import policy with destination/DNS/redirect controls,
streaming byte limits and deadlines. Test denial before source or provider I/O.

## R03 [P1] Discovered MCP Tools Default To Side-Effect-Free Execution

Location: src/mcp/MCPTool.js:30; src/mcp/MCPClient.js:111;
src/tools/adapters/MCPDiscoveryLoader.js:48.

Both import paths omit risk/execution metadata. Tool supplies sideEffectLevel none
and executionPolicy auto, so Agent's automatic risky-tool verifier is skipped.
Discovery also ignores destructive annotations and supplies no host risk override.
A synthetic delete_records definition with destructiveHint true executed through
Agent.runTool with no verifier or approval and returned completed.

Fix: classify remote actions conservatively, expose trusted host overrides, and
require explicit authorization for unknown effects. Remote annotations are hints,
not sufficient authority to downgrade a tool to safe/read-only.

## R04 [P1] Fallback Ignores Non-Retryable And Uncertain Outcomes

Location: src/llm/FallbackRouter.js:150.

The catch path tries the next provider regardless of retryable false, uncertain
true, policy denial or cancellation. A synthetic image producer reported a lost
response after remote acceptance with both flags; the second producer still ran.
This can duplicate billable generation or cross a boundary after a terminal denial.

Fix: define explicit fallback eligibility. Propagate cancellation, policy denials
and uncertain/non-repeatable outcomes without redispatch; reserve and authorize
each permitted provider attempt independently.

## R05 [P1] Legacy Provider Retries Escape Runtime Dispatch Accounting

Location: src/llm/anthropic.js:32; analogous retry wrappers in openAi.js,
deepSeek.js and gemini.js. Runtime boundary: src/agent/Agent.js:1142.

The runtime reserves one model call/budget and invokes an adapter, but legacy
adapters retry internally. SDK retry defaults add another potential retry layer.
The legacy text method signatures also discard the runtime signal instead of
passing it to request options, so an outer timeout is not effective cancellation.

Reproduction: with modelCalls limited to one, zero Agent retries and two adapter
retries, the mocked Anthropic transport ran three times while executionCounts
recorded one call. This demonstration excludes additional SDK-native retries.

Fix: have one runtime-owned retry layer, disable internal/SDK retries when governed,
propagate AbortSignal, and authorize/reserve every actual network dispatch.

## R06 [P1] Gemini Text Generation Misreads The Installed SDK Response

Location: src/llm/gemini.js:64.

The installed @google/generative-ai SDK declares and implements functionCalls as
a method. The adapter calls response.functionCalls?.map instead. An SDK-shaped
response, including a plain text response with no calls, throws
response.functionCalls?.map is not a function. Existing mocks do not protect this
contract. Other history/schema mappings still need provider-native fixtures.

Fix: invoke functionCalls(), normalize an absent result to an empty array, and
test actual installed-SDK-shaped response helpers rather than array properties.

## R07 [P1] Anthropic Receives Agent History In The Wrong Representation

Location: src/llm/anthropic.js:34 and 41.

Agent sends a message array containing system instructions and its common tool
history representation. AnthropicAdapter forwards the array unchanged, sets the
top-level system field to undefined and does not translate function/tool messages
to provider-native tool_use/tool_result blocks. A captured ordinary Agent request
contained roles system,user with no top-level system value. This is not a valid
provider-native history conversion.

Fix: separate system instructions, translate complete tool turns with matching
IDs and validate native request fixtures before certifying Agent compatibility.

## R08 [P1] Truncated Model Output Is Marked Completed

Location: src/llm/openAi.js:85; similar completion metadata loss in legacy adapters.

The adapter drops finish_reason even though Agent uses completionStatus/finishReason
to decide whether to pause. A mocked completion with finish_reason length produced
a completed Agent run with resultStatus completed. Downstream code cannot tell
that the answer was cut off and may treat partial output as a final decision.

Fix: normalize stop/truncation/refusal states into the public completion contract,
including tool-call branches; assert that truncated responses pause rather than
completing or dispatching actions based on partial arguments.

## R09 [P1] Workflow Resume Can Execute An Already-Running Step Again

Location: src/runtime/workflow/WorkflowRunner.js:208 and 235.

resumeRun accepts running runs and has no run lock or atomic claim. A second
continuation loads a snapshot before the first step finishes and executes that
same step. A local barrier-based test with one runner produced two step calls.
External effects can be duplicated even within a single process.

Fix: guard lifecycle operations with a common ownership mechanism; reject active
resume without explicit crash reconciliation, and require shared transactional
claims/fencing for multi-worker recovery. Also reject run-ID overwrites on run().

## R10 [P1] Concurrent Scheduler Ticks Dispatch The Same Job Twice

Location: src/runtime/BackgroundJobScheduler.js:73 and 95.

listJobs and saveJob(status running) are separate operations, with no exclusive
claim or in-process guard. Two schedulers sharing InMemoryJobStore both executed
the same scheduled job in a deterministic concurrent test. Concurrent ticks on
one scheduler have the same race. A running job left by a crash also has no
built-in ownership/reconciliation protocol.

Fix: add atomic job claiming and explicit recovery states; serialize local ticks
and document/store-test the ownership contract across workers. Do not rely on
private/atomic file replacement to make read-modify-write scheduling transactional.

## R11 [P2] Realtime Interrupt Can Relabel Old Output As Current

Location: src/runtime/RealtimeSession.js:108 and 112.

Epoch validation happens before awaiting receive authorization and persistence.
interrupt() can advance the epoch during either await. The old frame is then
persisted/yielded using this.epoch, incorrectly making it current. The same gap
can yield a frame after close while authorization was pending.

Reproduction: hold receive authorization for an epoch-zero text frame, interrupt,
then release authorization. The emitted OLD frame was labelled epoch one.

Fix: capture the source epoch and recheck epoch/session/cancellation after awaits
and before yielding; serialize the final receive commitment with interrupts.

## R12 [P2] RAG Chunk IDs Collide Across Indexing Calls

Location: src/rag/RAG.js:180.

IDs use Date.now plus a per-call array index. Calls resolving in the same
millisecond in the same namespace generate identical IDs and upsert silently
overwrites prior documents. A fixed-clock test indexed document A and document B;
both returned 12345-0 and only document B remained.

Fix: use a collision-resistant ingestion ID or explicit stable document/version
identity combined with chunk position. Test concurrent imports and reindex policy.

## R13 [P1] Sparse Vectors Can Poison The Entire File Snapshot

Location: src/db/VectorContract.js:12; src/db/LocalVectorStore.js:23;
src/db/FileVectorStore.js:91.

Array.some skips holes. values new Array(2) passes validation and is persisted
with null elements; the upsert returns success. The next operation reloads and
rejects the record, blocking all namespaces in the file until manual repair.
This was reproduced in a local temporary directory during the preceding review.

Fix: require dense, finite numeric arrays and validate the complete serialized
snapshot contract before replacing committed state. Test that rejected writes
preserve existing records and restart readability.

## R14 [P2] File Vector Inputs Remain Mutable After Validation

Location: src/db/FileVectorStore.js:111.

upsert retains caller-owned values across filesystem awaits. Extending a validated
one-dimensional vector to 65,537 elements immediately after calling upsert bypasses
the portable dimension ceiling; the write succeeds but subsequent loads reject it.
This was reproduced locally during the preceding review.

Fix: synchronously validate and capture detached input before the first await,
then enforce the same record invariants before committing. Apply equivalent
capture semantics to query filters and delete IDs to avoid request drift.

## Verification And Limits

npm run test:foundation passed: 466 tests, 28 suites, 14 live tests skipped,
strict public TypeScript checks and the scoped multimodal example. git diff --check
passed. The passing suite does not cover the reproduced adversarial cases above.
No live provider, actual staging, independent review or deployment performance
acceptance was performed. No new universal-readiness claim is justified.

Suggested repair order: egress and remote tool boundaries (R01-R04), actual dispatch
accounting and provider contracts (R05-R08), ownership/recovery (R09-R10), persistence
integrity (R13-R14), then realtime sequencing and ingestion identities (R11-R12).
Each fix needs a failing regression test first and a full foundation rerun afterward.
