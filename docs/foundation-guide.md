# Agent Foundation Guide

## Offline End-To-End Check

```sh
npm run test:foundation
```

This runs local tests, public TypeScript checks, and the scoped multimodal example.
It does not use paid provider APIs or establish live provider certification.

The example combines Agent, a guarded custom text provider, scoped retrieval and
conversation storage, producer tools, child-run inspection, JSON output validation,
and authorized artifact resolution. Its providers and artifact store are deterministic
fixtures, not real generation services or persistent infrastructure.

## Embedding Contracts

RAG indexing, VectorStoreRetriever and semantic memory require exactly one dense,
finite numeric vector per input and consistent dimensions within each batch.
Malformed results fail before any vector query or write and are not retried as
transient failures. Indexed provider batches must supply a complete, unique set
of zero-based indices; results are reordered before binding vectors to source text.
Missing, duplicate, mixed or out-of-range indices are rejected.

Hugging Face embedChunks now returns `{ embedding: number[] }` records rather than
raw arrays, matching the existing consumer contract. Custom adapters returning raw
vector arrays remain accepted by RAG and memory. Token-level matrices are rejected:
the host must select a pooled embedding model rather than rely on implicit averaging.
Normalization produces detached vectors and bounds batches to 10,000 inputs,
vectors to 65,536 dimensions and JSON complexity to one million nodes/64 MiB under
SchemaSafety's accounting. This validates result structure, not semantic quality,
model-version compatibility or live provider certification.

## Recovery, Approval Integrity And Resource Budgets

Agent lifecycle operations use a process-local InMemoryRunLock by default.
FileRunLock({ directory }) supplies exclusive ownership across processes on a shared
filesystem. Every worker must use the same lock directory and lockNamespace. It
does not expire or steal locks: after a crash, a host supervisor must prove the
owner is dead and reconcile external actions before removing a stale lock. A
database/Redis deployment needs a host-provided RunLock with equivalent exclusivity;
there is no built-in distributed lease/fencing guarantee.

ApprovalSigner({ key }) optionally HMAC-binds the exact action, scope, schemas, and
tool metadata. Keep the signing key in host configuration and use authorizeResume
to authenticate the approver. A valid signature is not human consent. Approval
consumption is persisted before dispatch; a lost result stays uncertain and cannot
reuse the approval. SIGKILL tests cover termination before and after an external effect.
Do not automatically replay an uncertain action. Stable idempotency keys are passed
to tools; external services must actually implement their idempotency contract.

RunBudget({ limits: { tokens, costMicros }, estimate }) reserves host-estimated upper
bounds before model, tool, memory, retrieval, argument-resolution, and verifier work.
Missing estimates fail closed. Reservations survive failures and are not refunded.
Estimates must bound nested provider calls and retries. Reported model usage beyond
a bound blocks future work but cannot reverse charges already incurred. This is a
per-run control, not an account-wide billing ledger. Protect it with the shared run
lock. Standalone producer/realtime APIs have byte/frame/dispatch controls, not a
unified spend guarantee; use a budgeted Agent tool or host billing enforcement.

Agent invocationTimeoutMs bounds local waiting and propagates an AbortSignal. It
cannot guarantee a remote service stopped. Timed-out actions remain uncertain.
RunBudget, locks, HMAC signing, and deadlines are explicit configuration, not automatic
enterprise security. ProducerJobRunner supports the same lock contract for polling.

## Additional Agent Contracts

Agent.runMedia(operation, input, config) returns `{ run, result }` for the six legacy
image/audio/video operations. Existing helpers return the same raw provider-native
result as before. Media runs persist metadata, not buffers, signed URLs, transcripts,
or generated payloads. Host-supplied config.metadata and retrieval provenance still
need content-disclosure review. authorizeModelCall runs before context assembly and
again on the assembled request; GuardedProvider can additionally guard the adapter.
Runs use model dispatch/resource budgets and deadlines, never automatic media retries.
Failure after dispatch is conservatively uncertain; media runs cannot resume through
the text loop. Reconcile remote work explicitly. Model capability declarations are
enforced when supplied. Use ProducerRuntime to normalize and validate output content,
and ProducerTool to apply tool-policy, verifier and human-approval gates. runMedia is
not a bypass for those gates when the application requires them.

- Agent.runTool(name, args, config) executes through policy/approval/inspection without
  requiring a text model. Paused direct actions require explicit reconciliation.
- GuardedProvider models/defaultModel declare model-specific capabilities and reject
  unsupported selections before provider invocation. Declarations require live validation.
- ContentEnvelope provides a versioned text/JSON/artifact serializer with explicit
  completion states; it does not change legacy provider result shapes automatically.
  TraceSerializer.migrateTrace supports known legacy traces and rejects unknown versions.
- EpisodicMemory supports scoped append/search/forget/expiry with provenance. Retention
  deletion is explicit; capacity enforcement needs backend concurrency controls at scale.
- ScopedVectorStore requires a namespace-isolating backend contract. LocalVectorStore
  implements scoped query/upsert/delete and a documented subset of metadata operators.
  A cloud backend is not certified merely because its API resembles this interface.
- ScopedRetriever.authorizeMatch optionally rejects document-level ACL violations before
  context reaches the model. Host-authenticated scope remains mandatory.
- ArtifactResolver requireVersion requires metadata.version/etag and forwards it to
  storage.read; the backend must enforce that version atomically. It is not an integrity
  checksum or encryption mechanism.
- DelegationRuntime bounds child count/depth and accepts host authorization. State is
  shared only when supplied explicitly. Persisted counts need exclusive parent ownership;
  these are per-parent controls, not fleet-wide or adversarial-agent isolation.

RealtimeSession takes an authorized host transport with connect/send/events/interrupt/
close methods. It provides pull backpressure, frame/byte ceilings, local deadlines,
interruption epochs, and metadata-only inspection. Adapters must tag output with the
correct epoch and bound their own buffers. Old-epoch frames are dropped. Stream end
without an explicit completion event is incomplete. Local interruption/cleanup does
not establish remote cancellation. Only deterministic transport fixtures are tested;
no live voice/video vendor interoperability is claimed.

SchemaSafety defaults to bounded JSON size/depth/nodes and rejects regex patterns and
references unless explicitly reviewed and enabled. Existing schemas using patterns or
local references need host opt-in; external references remain blocked. Tool response
schemas are enforced, including imported OpenAPI status/data wrappers. API credentials
are transport-only, redirects are disabled, response sizes are bounded, and direct
undeclared header injection is removed. Same-origin checks are not DNS/SSRF protection:
the host must approve destinations and restrict network egress. Imported API tools
default to external_write and never retry unless trusted host metadata overrides them.

## Context Without Destructive Compaction

```js
const { ContextWindow } = require('agnostic-agents');
const contextWindow = new ContextWindow({
  maxTokens: 8192,
  reserveOutputTokens: 1024,
  pinnedMessages: [{ role: 'system', content: 'Require approval for refunds.' }],
  // Optional: countTokens({ messages, tools }) using the selected provider's tokenizer.
  // Optional: summarize({ messages, sourceIndices, availableTokens }) returns text.
});
```

Pass contextWindow to Agent. Projection preserves system instructions and the latest
user turn with its subsequent tools/results. Older turns remain in run.messages;
source/omitted indices and summary provenance are recorded in run.state.contextWindow.
If mandatory context or a summary cannot fit, the call fails instead of deleting
constraints. Tools are included in the counted request and maxTokens is capped at
the reserved output space. Without a tokenizer, byte-based counts are labeled estimates;
provider message formatting and tool overhead must be included by a custom counter.

Summaries are optional host code, may themselves disclose data to a model, and are
not guaranteed semantically lossless. Test them against domain-specific facts and
constraints. Pin critical instructions explicitly. A single latest turn with very
large tool results currently fails rather than selectively compacting those results.

## Conversation Archives And Memory Scope

Memory accepts conversationStore implementing BaseLayerStore. Await
storeConversation() so persistence errors reach the caller. Agent does this
automatically. conversationLimit bounds the active view, while
getConversationHistory() reads the archive. hydrate() restores the active view.
deleteConversationHistoryBefore(timestamp) and clearConversation() explicitly delete
archived records; set retention according to the deployment's actual requirements.

Await clearWorkingMemory(), clearProfile(), clearPolicies(), clearEntities(), and
clearAll() to observe persistence failures. clearAll() includes EpisodicMemory.clear()
and fails if a custom episodic backend cannot support deletion. Synchronous reads,
compact(), decayExpired(), and enforceRetention() may schedule persistent deletions;
await flushStorage() before claiming those deletions completed. Async layer setters
drain pending evictions before key reuse and surface compaction deletion failures.
These are not cross-worker transactions; shared backends need exclusive ownership.

Archives contain raw content, are optional, and have no default expiration. A
ScopedLayerStore namespaces keys for a host-authenticated tenant. Give each memory
layer its own backing store or distinct host-controlled namespace. Do not expose
the backing store, archive APIs, or scope constructor directly to model/user inputs.
Working/profile/policy layer eviction still follows their existing policies.

ScopedRunStore namespaces backing run IDs while preserving logical IDs and lineage
in its public interface. ScopedRetriever forces a tenant namespace/filter and rejects
any returned match without matching metadata.tenantId. Authorization runs before
search; only documented result fields are returned. RAG now supports a custom
retriever without requiring a vector database. The wrapped backend must implement
the filter dialect correctly; post-checks do not make a shared database unprivileged.

These wrappers provide logical isolation, not authentication, encryption, or process
isolation. Bind them from authenticated host context; never let users choose tenantId.
Conversation archives and stores remain privileged interfaces.

## Provider Egress And Execution Limits

GuardedProvider wraps existing or custom providers and checks authorize() before
each supported operation, including embeddings and media methods. Only literal
true allows the call. For custom providers, supply capabilities explicitly for
operations beyond text. Reuse guarded providers in Agent, RAG, memory, and verifier
configuration if all those outbound paths need protection. A raw provider reference
or a separately configured producer is not covered by another provider's guard.

Agent also accepts authorizeModelCall(request, { run }) for its main text loop.
These are host permission hooks, not network firewalls or data classifiers.
Endpoint allowlists, TLS, proxy restrictions, private deployments, and provider
data-processing terms remain host/deployment concerns.

Agent defaults to 32 model dispatches and 64 tool dispatches per run. Configure
executionLimits to change these ceilings. Counts are reserved before dispatch,
persist in state across resumption, and count retry attempts. They are not atomic
across concurrent workers and do not enforce spend or exact token billing.
Serialize execution of each run or supply host locking before using multiple workers.

Tools marked retryabilityHint never are never automatically retried. Risky actions
(external_write, system_write, destructive) are also not retried unless both
idempotencyHint idempotent and retryabilityHint retryable are explicitly declared.
The declaration must reflect actual service-side behavior; metadata cannot make
an operation idempotent. Adaptive escalation may pause an uncertain action but
does not authorize repeating it.

## Approvals And Cancellation

Approval requests now have unique IDs and a five-minute default expiry. Configure
approvalTtlMs and authorizeResume(request, { run, config }) from the host. Even
approved: true cannot bypass a configured authorizeResume check. Current tool policy
is rechecked before resumption. Missing/expired approvals are rejected; older saved
requests without expiry need a new host review, not a fabricated expiry.

The host must authenticate reviewers and bind their decision to the exact saved
request. Approval records are not signed; concurrent resumption still requires host
locking. Runtime state and configuration must not come from unauthenticated clients.

Agent.run(input, { signal }) checks cancellation around execution and propagates
the signal to model configuration, tools, and producer children. Cancellation
prevents later dispatches but cannot undo completed external actions. An adapter
or tool must cooperate to interrupt an in-flight call. The separate cancelRun()
store update does not interrupt another worker's active network request.

## Outputs, Streams, Artifacts, And Remote Jobs

Agent outputSchema validates final JSON: string responses are parsed and the validated
value becomes run.output. Invalid output fails the run and clears run.output.
ProducerRuntime outputSchema validates the complete { content: [...] } result.
Supply schemas from trusted code; arbitrary tenant-supplied regexes or schemas need
separate complexity controls.

FunctionProducer streams map operation names to async iterables yielding
{ type: 'content', content: [...] }. ProducerRuntime.stream() pulls on demand,
closes upstream on consumer interruption, and persists a terminal run. It yields
content events followed by a terminal event containing the run. Partial content is
provisional until terminal completion; final schema validation may still fail.
maxOutputBytes defaults to 10 MiB and limits accumulated output. Cancellation is
cooperative, not an automatic remote voice-session or media-job stop command.

ArtifactResolver requires host authorization before metadata access, validates
tenant ownership and declared size, and bounds reads while consuming binary chunks.
It returns bytes only after a complete read. It does not fetch arbitrary URLs.
timeoutMs defaults to 30 seconds for the entire operation, including authorization,
metadata lookup and streaming (not a resettable per-chunk timeout). maxChunks defaults
to 10,000, counting empty chunks too. Storage and authorization receive an AbortSignal.
Deadline/cancellation requests stop local delivery; host implementations must honor
the signal to stop their own I/O. JavaScript callbacks cannot be forcibly preempted.
Failed streams receive iterator.return() with cleanup bounded to at most one second;
non-cooperative host work may outlive the rejected read and must be managed by the host.

When metadata supplies sha256, the resolver validates its 64-digit hexadecimal format
and verifies it against the complete bytes before returning data. requireIntegrity:
true rejects missing hashes before reading. Uppercase hashes normalize to lowercase.
For immutable, verifiable reads, combine requireIntegrity: true with requireVersion:
true and have the store enforce the forwarded version/etag. Verified results include
sha256 and version when present. Metadata values are captured before streaming so
later mutation cannot relax the original size/hash constraints. Storage failures
produce sanitized non-retryable errors, without private backend error messages.

An unkeyed hash proves agreement with the expected digest, not trusted authorship,
safe decoding or tenant authorization. The expected metadata must come from trusted
host storage; a compromised backend that replaces both bytes and digest is outside
this check. Existing stores without hashes remain compatible unless strict integrity
mode is selected. The runtime does not create hashes, private artifact storage or
deletion infrastructure on behalf of the host.
Host stores must prevent content/metadata replacement races, implement retention,
and restrict access to the underlying storage. Media-type declarations alone do
not establish that uploaded bytes are safe or authentic.

ProducerJobRunner starts remote work once, persists its job ID, and resumes polling
from that ID. maxPolls bounds each invocation; pollIntervalMs is capped at 60 seconds.
An uncertain start is paused for host reconciliation, never automatically restarted.
Use the provided idempotency key in the service if supported. Caller cancellation
stops local polling, not the remote job. Protect job run-store access and serialize
polling per run. ProducerJobRunner applies a local deadline (60 seconds by default);
remote backends should also implement service-side cancellation/timeouts.

## File Persistence And Recovery Evidence

FileRunStore and FileJobStore reject path separators in IDs, write private temporary files, sync
file contents, and atomically renames them into place. On supported systems, reads
do not follow a symlink at the run-file path. Configure a trusted private directory:
ancestor symlinks, host filesystem access, concurrent workers, disk encryption,
and directory durability across power loss are not solved by these stores.
Temporary files may remain after process termination and need host maintenance.

The forced-termination test verifies that a committed run survives SIGKILL and that
an intent record is not mistaken for a completed action. It does not prove exactly-once
external actions, power-loss durability, or recovery across every checkpoint boundary.
FileLayerStore uses the same private atomic writes but remains a read/modify/write backend; it is not a concurrent
production database. Use a backend with transactions/locking for shared workloads.

## Promotion Helpers And Release Compatibility

EvalHarness requires an assertion returning literal true; missing/undefined verdicts
fail rather than producing positive evidence. Async learning-loop recording is awaited.
Long-context fixtures cover pinned constraints, source-linked facts, and untrusted
summary roles. Lexical fixtures do not demonstrate real-model semantic retention or
resistance to every prompt injection; evaluate supported models on domain scenarios.

Missing or empty reports no longer allow release promotion. FailureInjectionSuite
requires explicit positive inputs instead of defaulting missing flags to success.
These older helpers still inspect declarations; they are not a cryptographic proof
or an actual failure-injection engine. Use measured test reports and independent review.

This work is unreleased. Before publishing, review versioning for tightened behavior:
metadata-only webhooks, fail-closed simulation/policy, approval expiry, dispatch
ceilings, safer risky-action retries, async conversation persistence, and invalid
output rejection. Existing approvals lacking expiry, scope binding, or captured tool
contracts need fresh host review. Enabling ApprovalSigner also invalidates unsigned
pending approvals; do not retrofit signatures onto an action without renewed review.
