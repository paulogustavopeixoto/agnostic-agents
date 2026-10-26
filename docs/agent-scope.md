# Agent Runtime Scope

For ordered work, acceptance tests, external dependencies and the final completion
gate, use the [production-readiness execution plan](production-readiness-plan.md).

## Purpose

Keep agnostic-agents an open-source, embeddable runtime for building, executing,
and inspecting agents. A platform should consume the same public runtime interfaces
as any other application. Agent execution, inspection, memory, retrieval, and custom
provider support must remain usable without a hosted service or proprietary control plane.
The package currently uses the MIT license.

Provider agnosticism means adapters can implement explicitly declared capabilities.
It does not mean every provider supports every modality, tool protocol, or model feature.
Output agnosticism means the runtime can represent text, structured data, and artifacts
with arbitrary MIME types, while adapters handle provider-specific formats.

## Package And Platform Boundary

| Concern | Package responsibility | Application or platform responsibility |
| --- | --- | --- |
| Agent definition | Instructions, provider references, tool schemas, execution configuration | Agent builder UI, templates catalog, workspace management |
| Providers | Capability contracts, adapters, normalized results and errors | Provider account onboarding, credential vault, commercial contracts |
| Outputs | Text, structured data, media references, validation, production lifecycle | Asset hosting, editors, delivery, CDN, media library |
| Execution | Runs, steps, checkpoints, cancellation, retries, interruption, recovery contracts | Worker deployment, queue hosting, infrastructure scaling |
| Inspection | Events, trace export, usage, provenance, redaction hooks | Dashboards, analytics hosting, alert delivery |
| Memory | Replaceable stores, scopes, access checks, retention, provenance | Database operations, identity management, organization administration |
| Retrieval | Retriever interfaces, filters, source attribution, context assembly | Knowledge-management UI, crawling infrastructure, source credentials |
| Tools | Contracts, validation, permission hooks, side-effect metadata, execution records | External service accounts, sandbox provisioning, network isolation |
| Human review | Pause, decision records, authenticated decision hooks, resume | Approval inbox UI, user authentication, notifications |
| Evaluation | Fixtures, assertions, run comparisons, regression results | Product reporting, experimentation UI, business analytics |
| Composition | Agent delegation, scoped context, bounded child runs | Company hierarchies, staff management, business operating models |

Security spans both sides: the package must enforce supplied permission decisions
and propagate trusted scope. The host authenticates identities, supplies secrets,
and provisions isolation. Accepting a tenant identifier alone does not establish
authorization. Retrieved documents, tool responses, and media metadata remain
untrusted data, even when used as model context.

## Required Agent Foundations

- Explicit provider and model capabilities, with unsupported requests rejected before execution.
- Versioned content and result contracts for text, structured JSON, and media artifacts.
- Unified inspection for model, tool, retrieval, memory, approval, and producer steps.
- Output schemas and validation that distinguish invalid, incomplete, cancelled, and failed results.
- Streaming with backpressure, cooperative cancellation, and modality-specific interruption semantics.
- Durable state boundaries, bounded retries, idempotency, and explicit handling of uncertain external actions.
- Context budgets with reserved output space, pinned constraints, provenance, and tested compaction behavior.
- Optional working, conversation, episodic, semantic, and preference memory through replaceable stores.
- Retrieval independent of a particular vector database, with source attribution and enforced access scope.
- Permissions and budgets around model calls, tools, media production, memory access, and retrieval.
- Human intervention and agent delegation using the same run lifecycle and trace contracts.
- Portable configuration, schema migrations, typed extension points, and compatibility tests.
- Behavioral evaluation covering task success, context retention, cost, latency, recovery, and unsafe actions.

These are requirements, not a declaration that all are implemented.

## Implementation Checklist

Partial means some building blocks exist, but the full requirement is not verified.
No row below should be treated as enterprise certification.

| Foundation | Status | Existing evidence and remaining acceptance work |
| --- | --- | --- |
| Provider/model capabilities | Partial | GuardedProvider per-model declarations and rejection tests; live certification and vendor conversions remain. |
| Versioned content/results | Partial | ContentEnvelope, explicit completion states, known legacy trace migration; provider-specific conversions and wider migration fixtures remain. |
| Unified inspection | Partial | Model/tool/retrieval/memory/argument steps, producer lineage, direct tool runs, metadata-only realtime and all six media-helper runs; live cross-provider trace conformance remains. |
| Output validation/states | Partial | Agent/tool/producer schemas, incomplete and uncertain outcomes, bounded schema complexity; legacy result shapes are not universally migrated. |
| Streaming/interruption | Partial | Pull streams, local deadlines, RealtimeSession epoch interruption and cleanup tests; actual voice/video transports and remote cancellation evidence remain. |
| Durability/retry/idempotency | Partial | Atomic stores, lifecycle locks, single-use consumption, stable action keys, job IDs, SIGKILL before/after side effects; production backend ownership and reconciliation remain. |
| Context preservation | Partial | Non-destructive ContextWindow selection, pinned constraints, output reserve, source-linked summary hooks, conversation archives; real-model semantic retention evaluation remains. |
| Memory choices | Partial | Scoped episodic memory with expiry/deletion, archives, working/profile/policy layers and namespace-isolated local vectors; cloud backend retention/access conformance remains. |
| Scoped retrieval | Partial | Tenant filter/post-checks, provenance, authorizeMatch document ACL hook and denial tests; deployed backend certification remains. |
| Permissions/budgets | Partial | Fail-closed hooks, conservative token/cost reservations for Agent operations, scoped stores and artifact version pins; nested-call estimates and deployed egress need validation. |
| Human review/delegation | Partial | Optional HMAC action binding, persisted single-use approvals, lifecycle locks, bounded/authorized delegation and crash tests; deployed identity, ownership and incident recovery remain. |
| Portability/extension contracts | Partial | Expanded strict public types, content/trace migration, standard MCP tool payloads via transport adapter; live protocol/backend conformance remains. |
| Behavioral evaluation | Partial | Context/stream/scope/policy/contracts/job and crash fixtures; domain-specific semantic retention, broad adversarial/load and live-provider evidence remain. |

### Implemented Components With Local Evidence

- [x] ProducerTool gates and correlated media runs.
- [x] Producer and Agent structured output validation.
- [x] Context projection, pinned constraints, summary provenance, and output reserve.
- [x] Conversation archives, explicit history deletion, and awaited writes.
- [x] Logical run/memory namespaces and retrieval scope checks with negative tests.
- [x] Provider-operation and approval-resumption authorization hooks.
- [x] Dispatch limits and safe defaults for retrying declared risky actions.
- [x] Pull-based producer streams with cleanup and output bounds.
- [x] Authorized, tenant-checked, bounded artifact reads.
- [x] Persisted remote job IDs, bounded polling, and uncertain-start handling.
- [x] Atomic private run-file replacement, path checks, and committed-state SIGKILL test.
- [x] Strict public type checks and offline scoped multimodal integration example.
- [x] Conservative per-run token/spend reservations and uncertain timeout handling.
- [x] Optional signed approvals and crash-tested persisted single-use consumption.
- [x] Process/shared-filesystem ownership locks without unsafe expiry or stealing.
- [x] Episodic memory, local vector namespace isolation, and document ACL hooks.
- [x] Realtime transport contract with frame bounds, epoch interruption, and cleanup.
- [x] Versioned content envelopes, known legacy trace migration, and per-model guards.
- [x] API credential separation, transport bounds, and corrected MCP tool contracts.
- [x] Direct tool-only agent execution and bounded delegation.
- [x] Legacy media helpers use inspectable authorized/budgeted runs without raw media persistence or automatic retries.
- [x] Awaitable layer/episodic deletion and observable eviction failures.
- [x] Explicit positive evaluation verdicts and long-context fact/provenance fixtures.
- [x] Ten-provider coverage catalog with new Mistral/xAI chat, ElevenLabs speech,
  and fal/Higgsfield job connectors; contract evidence remains separate from live smoke.
- [x] Host-client Pinecone, Qdrant and pgvector vector adapters with namespace isolation,
  scoped deletion, rejected unsupported filters and local deadlines.
- [x] Gated expanded-provider/vector live suites and offline configuration preflights.

See [foundation-guide.md](foundation-guide.md) for usage, migration, and boundaries.
These components do not mean every broader foundation row is complete.

### Local Verification Snapshot

On 2026-10-23, `npm run test:foundation` passed 449 tests (14 live tests skipped),
strict public TypeScript checks, and the offline scoped multimodal example.
`npm audit --omit=dev` reported zero advisories; the full development-tool audit
still has the separate Jest/micromatch/braces findings documented in package-audit.md.
These results cover deterministic package contracts, not arbitrary services or deployments.
The support shortlist now names ten providers and three independent vector backends;
actual models, modalities and service deployments still require live conformance.
See [integration targets](initial-support-targets.md). Provider-native media
conversion, remote cancellation and model semantic retention are service-specific;
independent security review and deployed isolation cannot be replaced by local tests.

### Platform Readiness Gates

**Private prototype: start now.** Use curated tools, test or non-sensitive data,
trusted operators, and reviewed providers. Build the UI and host infrastructure
outside this package. Pin the package version and expect API evolution. This is
a suitable stage for validating product workflows, not demonstrating tenant isolation.

**Limited customer pilot: blocked pending evidence.** Before customer data, verify
authenticated tenant scope through tools, retrieval, memory, artifacts, and run
access; approve outbound destinations; protect persisted state; test deletion;
bound loops, calls, and costs; and exercise approval, cancellation, and uncertain
side-effect handling against the actual deployed backends. Start with a small,
explicit set of supported modalities/providers, rather than promising all of them.

**Enterprise production: blocked pending evidence.** Complete the pilot controls,
independent security review, realistic fault/load tests, operational response and
recovery exercises, and live provider/backend conformance for supported configurations.
Encryption, identity, network isolation, hosting, and incident operations are host
responsibilities and need their own verification. Regulatory or contractual suitability
must be assessed for the actual deployment; no package checkbox establishes it.

The readiness gate is determined by the capabilities a platform exposes. An internal
text-only prototype need not wait for realtime voice. A shared enterprise platform
cannot skip isolation because its first agent produces only text.

## Current Gaps And Delivery Order

### 1. Unified Execution

ProducerTool now bridges ProducerRuntime into the Agent tool/RAG/memory loop.
Producer calls inherit tool policy, approval/verification gates, and parent/child
run links. A configured per-tool/per-run dispatch ceiling is reserved before
production. This ceiling is a call-count budget; optionally configure RunBudget
for conservative spend/token reservations around the Agent execution path.

The host supplies toContent(args), which can capture approved context from its
own closure; parent history, secrets, memory, and RAG results are not automatically
forwarded to the producer. This minimizes accidental disclosure. Configure a shared
durable run store to inspect both parent and child after a process restart.

ProducerTool defaults to external_write and retryabilityHint never. The host must
configure verification/approvals appropriate to that action. Agent respects the
never hint at both its outer and adaptive retry layers. Failed/uncertain attempts
consume the dispatch ceiling. Reservation is not a distributed atomic budget or
an exactly-once guarantee. Direct Tool.call is not a substitute for Agent policy.

ProducerRuntime optionally validates the complete `{ content: [...] }` output
against a trusted host-supplied JSON schema. JSON content must contain only finite,
serializable JSON values. Agent also validates final JSON outputSchema. Schema
complexity is bounded by SchemaSafety, with explicit host opt-in for regex/local
references. Existing media helpers now share run ownership, authorization, resource
budgets, local deadlines, and metadata-only inspection through Agent.runMedia.
Their provider-native results remain unchanged; use ProducerRuntime for normalized
content/output-schema validation and ProducerTool for approval-gated media actions.

Acceptance: a text agent can invoke a configured media producer through permission
and budget checks, with correlated steps and artifact references in its trace.
Schema-validated structured JSON now has an explicit output contract. Conservative
RunBudget reservations are available for Agent operations; direct producer/realtime
spend still requires host enforcement. Unified execution acceptance is locally tested,
not certified for arbitrary providers.

### 2. Context And Memory

ContextWindow now selects context without deleting run history, preserves system
instructions and the latest turn, reserves output tokens, accepts a host tokenizer,
and labels fallback estimates. Optional summaries retain source-message indices.
Memory can archive conversation turns independently of its active view, with explicit
history deletion. Working/profile/policy eviction remains unchanged. Real-model
summary fidelity and large current-turn tool-result compaction still need work.

Acceptance: long-task fixtures retain pinned constraints and recover relevant facts;
storage failures and token-budget overflow are observable rather than silently ignored.

### 3. Artifact And Streaming Contracts

ArtifactResolver checks authorization, tenant ownership, and bounded reads.
ProducerRuntime streams through a pull-based iterator with interruption cleanup.
ProducerJobRunner persists job IDs and bounds polling per invocation. Realtime
voice transport adapters and provider-confirmed interruption remain outstanding.
Local deadlines, optional artifact version pins, and shared-filesystem job ownership
are implemented; the storage/transport backends must enforce their contracts.

Acceptance: unauthorized artifacts cannot be resolved; interruption closes local
streams; remote cancellation limitations are reported without claiming completion.

### 4. Recovery And Security Evidence

A real SIGKILL test verifies committed run persistence. FileRunStore uses atomic
replacement and rejects traversal IDs. Risky actions are not retried without explicit
idempotent/retryable declarations. Uncertain remote starts require reconciliation.
Approval integrity/consumption, bounded schemas, and before/after-action crash cases
are now tested. Complete external-action fault coverage, independent network/file/
shell boundary audits, and deployed authenticated-approval verification remain.

Acceptance: process termination tests cover checkpoint boundaries and uncertain side
effects; an absent result never automatically means an action is safe to repeat.

### 5. Compatibility And Packaging

Strict public TypeScript checks and an offline custom-provider/scoped-retriever
example cover the integrated public surface. Complete backend conformance and
schema migrations, separate optional provider/operational dependencies where
compatible, and keep platform-specific conveniences out of future core APIs.

Acceptance: a custom provider and custom retrieval/memory backend can run without
requiring a vendor account or hosted platform. Live certification remains distinct
from mocked adapter tests.

## Existing Broader Surfaces

Fleet, federation, enterprise operating models, deployment certification, and business
outcome optimization already have exported helpers. Preserve compatibility for now.
Evaluate moving them into optional modules, examples, or companion packages through
a documented migration, rather than expanding them as core agent responsibilities.
No existing API is removed or formally deprecated by this scope document.

## Contribution Rule

A core feature should directly define agent behavior, execute an agent capability,
preserve agent state, enforce an agent boundary, or inspect/evaluate agent execution.
Features primarily administering users, businesses, infrastructure, or a SaaS product
belong outside the core. Runtime hooks supporting those applications belong inside.
