# Security Release Migration - 1.3.4

This release fixes R01-R14 from package-review-findings.md. It tightens unsafe
defaults; it does not certify every provider, deployment or realtime transport.
Continue following production-readiness-plan.md for outstanding external gates.

## Remote Tools

MCPTool, MCPClient.toTools and MCPDiscoveryLoader now default to external_write
and require_approval. Server annotations cannot downgrade this classification.
Trusted host code can provide MCPTool metadata or a metadataForTool(definition)
callback to discovery/toTools. Only mark a tool read-only after reviewing its
implementation and permissions, not because its name or remote description says so.

```js
const { tools } = await MCPDiscoveryLoader.load({
  mcpClient,
  metadataForTool: definition => reviewedReadOnlyNames.has(definition.name)
    ? { sideEffectLevel: 'none', executionPolicy: 'auto' }
    : { sideEffectLevel: 'external_write', executionPolicy: 'require_approval' },
});
```

Direct Tool.call is a low-level invocation, not an Agent policy boundary. Use the
Agent execution APIs when approvals, budgets and verification must be enforced.

## Media And Models

HFAdapter.analyzeVideo accepts Buffer/Uint8Array only. Resolve artifacts with
tenant authorization in host code first; URLs, file URLs and local paths are
rejected before any import. Uploads and responses are bounded, redirects disabled,
signals propagated and post-dispatch failures are not automatically repeated.
An exact working video model still needs live certification; the historical
default model name is not a provider-support guarantee.

Verifier and JSON-repair model requests now consult authorizeModelCall and consume
model-call/resource reservations with deadlines. Existing policies must explicitly
allow the intended verifier egress. Legacy adapters forward AbortSignal and disable
SDK-native retries. The OpenAI SDK dependency moves to the patched 6.x line with
Zod 4.6.6 or later; injected SDK internals/mocks must match its request contracts.
The package import/constructor smoke check also passes on Node 18.20.8. SDK file
uploads on Node 18 require the host to supply the SDK's documented global File
implementation (from node:buffer), or use Node 20+ where File is available. The
import check does not certify every modality on Node 18 or replace deployment tests.

Agent-controlled dispatch runs with internal RetryManager repetitions disabled.
FallbackRouter also stops internal fallback within such dispatches, preventing
multiple provider calls behind one reservation. Standalone text fallback can still
handle eligible transient failures; non-retryable, uncertain, policy and cancellation
outcomes stop immediately. Image/audio/video generation failures do not trigger
automatic fallback. Apply GuardedProvider separately to each provider for egress
policy when routing directly outside Agent; the router is not an authorization system.

Gemini uses functionCalls(), batchEmbedContents and provider-native system placement.
Anthropic separates system instructions and converts common tool history into native
blocks. Legacy text adapters preserve completion status: truncated output pauses,
and blocked/unknown stops are not represented as successfully completed answers.
Existing string-only follow-up/media APIs remain compatibility interfaces; use
Agent.run for inspectable completion state rather than assuming every string is final.

## Ownership And Recovery

Custom BackgroundJobScheduler stores must implement claimJob(jobId, expectedRunAt).
It must atomically return a running job only if its stored status is scheduled and
runAt matches the expected occurrence; otherwise return null. Never emulate this
with an unlocked get/save pair. Built-in memory and file stores implement claims.

FileJobStore uses exclusive filesystem claims. A crash can leave a running job or
stale claim directory. No age-based lock stealing or automatic rerun is provided.
The host must verify dead ownership, reconcile external side effects and decide
whether/how to reschedule. Manual schedule/save mutations are privileged operations
and must not reset active jobs. Use transactional custom claims for distributed DBs.

WorkflowRunner rejects duplicate run IDs, excludes concurrent lifecycle operations
and refuses to resume status running. FileRunStore supplies a shared-filesystem
ownership lock automatically; ScopedRunStore forwards it. Other multi-worker stores
must provide a common runLock. Before recovering a crashed running workflow, the
host must reconcile its actions, retain the audit record, move it to a resumable
state and remove only confirmed dead-owner locks. Do not change state or remove
locks while a worker may still be executing. Locks do not make external actions
exactly-once, and local filesystem tests do not establish distributed fencing.

Realtime output is rechecked after authorization and persistence awaits; interrupted
or closed-session output is discarded instead of relabelled as current. Transport
implementations still own real cancellation, device behavior and provider protocols.

## Storage

RAG indexing uses a unique ingestion ID, so concurrent imports do not overwrite
documents merely because they finish in one millisecond. Reindex/delete-by-document
policies remain application decisions; old timestamp-based IDs are not rewritten.

Vector validation rejects sparse arrays. FileVectorStore captures detached inputs
before awaiting I/O and revalidates records before commit. Existing snapshots that
were already poisoned require explicit restore/repair; the runtime does not erase
corrupt records automatically. See local-vector-storage.md for durability limits.
