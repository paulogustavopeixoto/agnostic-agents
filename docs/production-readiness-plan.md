# Production Readiness Execution Plan

Created: 2026-10-23.
Status: planned; implementation and production acceptance are not complete.
Purpose: turn agnostic-agents into a demonstrably reliable agent foundation for a
defined production support matrix, including realtime media and enterprise security.

This is the execution checklist for subsequent implementation work. It is not a
certification, a promise of flawless behavior, or a background task runner. An agent
working on this plan must update the checklist and evidence as it proceeds.

## 1. Outcomes And Meaning Of Done

The four required outcomes are:

1. Reliable operation for every explicitly supported provider/model/capability tuple.
2. Production-grade realtime voice/video for explicitly supported realtime profiles.
3. Measured recovery, isolation, deletion and performance on the selected deployment.
4. Independent security assessment, remediation and retest of the release candidate.

"Every supported" does not mean every model ever released, every vendor feature or
every possible combination of inputs. Freeze a versioned release matrix first. Each
supported tuple must name a provider, exact model/version, API/SDK path, capability,
transport and deployment profile. A catalog entry alone is not supported evidence.

All ten selected providers must receive an explicit disposition. Unsupported vendor
capabilities must reject clearly; do not fabricate features such as video generation
on a text-only adapter. Any reduction of the agreed target matrix requires documented
owner approval, not an agent silently dropping a failing integration to finish.

Completion requires all mandatory tasks, non-skipped live evidence for every accepted
tuple, deployment acceptance, and independent reviewer sign-off. Exceptions must have
an owner, rationale, expiry and explicit acceptance; they do not establish the excluded
capability as verified. No open critical/high security finding may pass the final gate.

## 2. Existing Baseline, Not Final Assurance

The repository's last recorded foundation check passed 449 tests, public TypeScript
checks and an offline multimodal example; 14 live tests were skipped. This is a
historical baseline to rerun, not a new test execution caused by this document.
Production dependency audit reported zero advisories; development tooling still had
28 high-severity affected packages through Jest/micromatch/braces. Recheck both.

Existing building blocks include inspectable runs, producer tools, context projection,
scoped memory/retrieval, approval signing/consumption, per-run budgets, file locks,
bounded HTTP, realtime transport contracts and opt-in live smoke suites.
LocalVectorStore is volatile; file-backed run/job/layer storage is not a persistent
vector database or a transactional distributed backend.

Existing integration inventory:

| Category | Starting inventory | Evidence limitation |
| --- | --- | --- |
| Text/general providers | OpenAI, Anthropic, Gemini, Hugging Face, DeepSeek, Mistral, xAI | Model/capability revalidation required |
| Speech | ElevenLabsProducer and existing provider audio methods | TTS is not realtime conversation |
| Image/video jobs | FalJobBackend, HiggsfieldJobBackend, ProducerJobRunner | Submission/polling is not interactive video |
| Vector retrieval | PineconeVectorStore, QdrantVectorStore, PgVectorStore, LocalVectorStore | Injected-client tests are not deployed conformance |
| Realtime | RealtimeSession contract | Deterministic transport fixtures, not vendor-certified sessions |

References: [agent scope](agent-scope.md), [integration targets](initial-support-targets.md),
[security boundaries](security-boundaries.md), [foundation guide](foundation-guide.md),
[package audit](package-audit.md), [provider certification](provider-certification.md).

## 3. Responsibilities And Required Access

| Owner | Responsibility |
| --- | --- |
| Coding agent | Inspect existing code; implement runtime/adapters/harnesses; run permitted tests; fix regressions; maintain evidence and blockers |
| Package owner | Approve matrix, budgets, compatibility changes, target SLOs, permitted test resources and release decision |
| Deployment owner | Provide authenticated staging, private secret injection, worker/DB/vector/artifact services, network controls and operational access |
| Independent reviewer | Assess code and deployed boundaries independently; report findings; retest remediation; issue a scoped conclusion |

Required inputs must be supplied through secure host configuration, never pasted into
this document or chat: fresh credentials, permitted model IDs, voice IDs, media input
fixtures, vector test resources, artifact storage, and staging access. Rotate credentials
previously exposed. Existing keys in an environment file do not prove current permission,
account access, provider-side retention settings or authorization for unrestricted spend.

Approve a maximum total live-test spend, per-provider limits, wall-clock limits,
load-test ceiling and permitted destructive-test namespaces. Define who can authorize
further spend. Do not create paid accounts, accept terms, provision infrastructure,
expose services, modify production data, publish releases or perform intrusive security
testing without the appropriate explicit authorization.

Package scope remains agent-focused. UI, account administration, billing, media CDN,
identity service hosting and infrastructure operations stay outside the package.
Reference deployments and test harnesses may exercise those boundaries without making
the runtime depend on a proprietary platform.

## 4. Execution Protocol

Execute phases in order. Within a phase, perform independent tasks while external
dependencies are pending. Work one reviewable vertical slice at a time: inspect,
implement, negative-test, integration-test, type-check, document, record evidence.
Preserve unrelated user changes; do not reset the working tree or amend commits.

Each task below starts unchecked. Check it only after its acceptance criteria have
measured evidence. If a previously implemented feature meets a task, validate it
instead of rebuilding it. No fake pass for a missing assertion, skipped live test,
quota error, absent service, mocked backend or placeholder artifact.

Maintain a task ledger with task ID, state (pending/in-progress/blocked/verified),
owner, dependency, implementation reference, test invocation, evidence location,
measured result and remaining risk. Store raw sensitive evidence privately; commit
only sanitized fixtures, summaries and hashes where appropriate.

Do not stop merely because code compiles or a batch of unit tests passes. Continue
with the next unblocked task until the final gate passes or meaningful work is blocked
by access, authorization, budget, external review or an explicit user pause. Record a
specific blocker, request only the missing input and continue unaffected work.
Do not retry a paid or uncertain external action indefinitely to avoid reporting a block.
When resuming in a new session, read this file, the ledger and the working tree first.
This protocol does not grant unlimited execution, persistent scheduling or permission
to bypass tool limits; those must be configured separately when needed.

## 5. Phase 0: Freeze Scope And Evidence Rules

- [ ] P0.1 Reproduce the baseline: run test:foundation, both dependency audits, package dry-run and a scoped secret scan; record actual failures/skips and environment versions.
- [ ] P0.2 Create a machine-readable release support matrix covering all ten providers, accepted exact models, capabilities, modalities, streaming modes and known unsupported requests.
- [ ] P0.3 Separate text/tool, embeddings/RAG, image/audio/video generation, transcription, media analysis and realtime conversation; do not imply one passing category proves another.
- [ ] P0.4 Define the three vector profiles, a persistent local vector profile, the run/job/memory backend, artifact backend and worker topology for the reference deployment.
- [ ] P0.5 Record explicit model IDs, voice IDs, SDK/API versions, vector dimensions/metrics, codecs/sample rates, regions and supported Node/OS versions. Do not put credentials in the matrix.
- [ ] P0.6 Agree on test budgets, controlled failure injection, permissions, release thresholds and approved test datasets before external calls or load tests.
- [x] P0.7 Create a threat model, data-flow map and data inventory covering inputs, provider egress, tools, memory, vectors, artifacts, approvals, traces, logs, exports and backups.
- [x] P0.8 Create a repeatable evidence format with commit/source hash, dependency lock hash, environment, tuple/profile, timestamp, command, counts/skips, metrics, cost and failure classification.

Deliverables: approved matrix, deployment profile, budget/SLO profile, task ledger,
threat model and evidence schema. Suggested new paths: docs/production-support-matrix.md,
docs/production-deployment-profile.md and docs/production-readiness-ledger.md.
These documents are draft scope and evidence artifacts, not approved deployment certification.

Exit gate: no ambiguous definition of "supported", "production" or "completed";
required inputs are either available or explicitly blocked with named owners.

## 6. Phase 1: Harden Shared Contracts And Local Durability

- [ ] P1.1 Review current runtime/provider/producer/vector interfaces and preserve one documented, versioned content/result contract with completed/incomplete/cancelled/failed/uncertain states.
- [ ] P1.2 Make capability checks model-specific and reject unsupported requests before dispatch; explicitly cover vendor deprecation, model removal and region/account restrictions.
- [ ] P1.3 Audit every provider call path for signal propagation, bounded requests/responses, local deadlines, safe error mapping and hidden SDK retries. Do not infer that outer cancellation cancels remote work.
- [ ] P1.4 Normalize usage/cost reporting without fabricating unavailable metrics; enforce host-estimated reservations across nested model, verifier, retrieval, memory and media work.
- [ ] P1.5 Verify malformed tool arguments, partial outputs, schema complexity, unknown fields, MIME mismatches, stream errors and unknown job states fail safely without leaking payloads/secrets.
- [x] P1.6 Implement persistent local vector storage behind the existing vector contract; retain LocalVectorStore's in-memory behavior for compatibility. Document the chosen on-disk format and migration/version policy.
- [x] P1.7 Test local vector restart persistence, scoped CRUD/filtering, deletion durability, corruption/truncation, disk-full/permission failures, interrupted writes and writer exclusion. Do not market flat-file scans as scalable vector indexing.
- [ ] P1.8 Complete public types, source import portability, supported-version tests and migration notes for tightened or asynchronous behavior.
- [ ] P1.9 Resolve development-toolchain advisories through verified compatible updates or a tested migration, not an unsafe forced downgrade; record any remaining advisory reachability and disposition.

Primary surfaces: src/llm, src/runtime, src/db, src/rag, src/agent/Memory.js,
index.d.ts and tests/types. Optional host drivers must not become compulsory
dependencies merely to keep the package provider-agnostic.

Exit gate: shared contracts and persistent-local durability pass positive, negative,
restart and corruption tests; no known unresolved critical/high dependency finding
enters the final release gate without remediation and independent assessment.

## 7. Phase 2: Verify Every Accepted Provider/Model/Capability Tuple

- [ ] P2.1 Turn the frozen matrix into parameterized conformance cases, with per-tuple credentials supplied privately and explicit expected unsupported behavior.
- [ ] P2.2 Audit existing OpenAI, Anthropic, Gemini, Hugging Face and DeepSeek adapters against their actual SDK/API behavior; do not assume historical support labels or old default models are still valid.
- [ ] P2.3 Audit Mistral/xAI chat/tool normalization, follow-up tool history, usage, truncation, refusals and unsupported feature rejection on the pinned models.
- [ ] P2.4 Audit ElevenLabs voice/model options, bounded audio reads and artifact persistence; verify the configured voice is authorized for the intended use.
- [ ] P2.5 Audit fal/Higgsfield model input contracts, queue/result states, error bodies, job identity, cancellation acknowledgments and idempotent asset imports for each accepted image/video model.
- [ ] P2.6 Run text and structured-output cases for every accepted text model: empty/malformed output, finish reasons, tool selection/arguments/results, multi-step tools, refusal, context limits and usage availability.
- [ ] P2.7 Run embedding/RAG cases where supported: dimensions, ordering, normalization, empty input, batch limits, source attribution, document ACLs and cross-tenant denial before model disclosure.
- [ ] P2.8 Run image/audio/video cases where supported: actual media bytes, declared/detected MIME, decoding, duration/dimensions, limits, incomplete production, authorized storage and subsequent artifact resolution.
- [ ] P2.9 Replace reference-only media smoke evidence with actual bounded asset import, integrity/version checks and private storage/read/deletion tests. Never forward provider keys to CDN/storage URLs.
- [ ] P2.10 Test outage/rate-limit/auth/quota/deprecation failures and fallback. Routing must preserve privacy, trust zone, capability and budget restrictions rather than merely choose a responding provider.
- [ ] P2.11 Run long-context tasks against real supported models before/after projection or summarization; score pinned instructions, fact retention, provenance, retrieval recovery and adversarial context without claiming summaries are lossless.
- [ ] P2.12 Run sustained multi-turn agent tasks, delegated tasks, tool errors and human approval/override through each accepted runtime path, not just isolated SDK calls.
- [ ] P2.13 Save sanitized measured evidence for every tuple and repeat across separate sessions; a missing service/model or skipped test leaves that tuple unverified.

Exit gate: 100% of accepted tuples have passing applicable contract, live and runtime
evidence with no missing mandatory case. Do not demand unsupported modalities from
a provider or claim "all models" from a single inexpensive model smoke test.

## 8. Phase 3: Production Realtime Voice And Video

Complete P1 first. Provider-specific live work may proceed alongside P2 once the
corresponding realtime tuple is approved. Choose and document actual vendor transports;
RealtimeSession alone does not supply a vendor adapter.

- [ ] P3.1 Freeze realtime profiles: conversational audio, live video input/analysis, and live generated video only where an accepted API genuinely supports it. Identify client/host responsibilities for WebRTC/WebSocket/media transport.
- [ ] P3.2 Implement the selected vendor adapters behind RealtimeSession: authentication, session setup, negotiated capabilities, event translation, version handling and explicit close/error semantics.
- [ ] P3.3 Implement bounded codecs/frame formats, sample-rate conversion rules, timestamps, sequence numbers, VAD/turn boundaries and tool events; reject incompatible or oversized input before dispatch.
- [ ] P3.4 Enforce backpressure at runtime and transport buffers with measured byte/frame ceilings, bounded queues and an explicit drop/pause/terminate policy for slow consumers.
- [ ] P3.5 Implement barge-in end-to-end: detect interruption, cancel/truncate the remote turn where supported, stop playback/output, advance epochs, discard stale frames and keep model conversation state consistent with what the user actually heard.
- [ ] P3.6 Support tool/approval waits during live sessions without bypassing policy, leaking credentials or executing tools twice after reconnect. Bound silence, waiting time and delegated work.
- [ ] P3.7 Implement disconnect, reconnect, network handoff, session expiry and credential refresh. Do not replay uncertain audio, tool actions or generated frames as if they never executed.
- [ ] P3.8 Track usage and per-session spend continuously; stop dispatch at enforced limits and report uncertainty when vendor accounting is delayed or absent.
- [ ] P3.9 Validate video frame pacing, supported resolution/frame-rate limits, A/V synchronization and stream discontinuities on actual transports, not only prerecorded video-generation jobs.
- [ ] P3.10 Test packet loss, jitter, stalled streams, slow consumers, simultaneous interrupts, half-open connections, malformed frames, expired credentials and remote cancellation failure.
- [ ] P3.11 Verify media/transcript recording is opt-in, raw frames stay out of ordinary traces, scoped retention works and debug logging does not bypass privacy settings.
- [ ] P3.12 Measure real first-output latency, turn latency, interruption-to-silence latency, reconnect time, A/V drift, memory growth and session error rates under target concurrency.

Suggested acceptance targets below are planning defaults, not measured promises.
Freeze or amend them with the deployment owner before testing; document the reason
for any change rather than relaxing a failed threshold after seeing results.

| Metric | Initial target for the agreed reference profile |
| --- | --- |
| Voice first audible response | p95 <= 1.5 seconds from committed user turn, excluding explicitly labeled tool/approval waits |
| Barge-in to local silence | p95 <= 250 ms from detected interruption |
| Stale-epoch output delivered | Zero observed after interruption acknowledgment in defined adversarial tests |
| Video A/V drift | p95 absolute drift <= 100 ms on the selected supported profile |
| Frame buffers | Never exceed configured byte/frame limits under the slow-consumer fixture |
| Reconnect | Successful recovery or explicit safe termination within 10 seconds for the agreed outage fixture |
| Privacy | Zero unauthorized raw-media/transcript disclosures in the defined negative-test corpus |

Record timestamp boundaries, network path, codecs, devices and whether metrics are
server-side or end-to-end. Provider delay, VAD delay and client playback are separate
measurements. A cancelled socket is not evidence of stopped vendor billing.

Exit gate: selected realtime profiles meet agreed SLOs in live end-to-end and soak
tests. A platform cannot claim realtime video generation based only on frame input
analysis or an asynchronous video job.

## 9. Phase 4: Actual Deployment, Recovery And Side Effects

Use a real, reproducible staging deployment matching the intended production topology.
This is reference integration/testing, not a requirement to ship a SaaS control plane.

- [ ] P4.1 Provision or connect approved staging workers, authenticated entry points, durable run/job/memory state, vector services and private artifact storage using host infrastructure tooling.
- [ ] P4.2 For multiple workers/machines, implement a transactional run/job/layer adapter and ownership contract appropriate to the chosen backend; inject host clients instead of embedding cloud administration in core.
- [ ] P4.3 Test distributed ownership with leases/fencing or equivalent exclusive transaction semantics, stale-owner rejection and safe failover. A process-local lock or arbitrarily removed lock directory is insufficient.
- [ ] P4.4 Make approval consumption, dispatch intent and resource reservations atomic under the selected ownership model. Preserve stable external idempotency keys and reconciliation status across workers.
- [ ] P4.5 Inject process kills before/after intent persistence, approval consumption, external dispatch, response receipt, result persistence, checkpoints, job submission and artifact import.
- [ ] P4.6 Inject database/vector/object-store outages, delayed writes, partial responses, network partitions, clock skew, duplicate delivery and worker restart during active tasks.
- [ ] P4.7 Verify resumptions do not silently change provider/model/policy/schema/scope. Migrate explicitly or reject when the saved execution contract is no longer valid.
- [ ] P4.8 Distinguish safe idempotent retries, read-only retries, uncertain non-idempotent actions and compensation. Never claim universal exactly-once execution of external services.
- [ ] P4.9 Verify replay is inspection/simulation by default and cannot resend real messages, spend money, regenerate media or mutate external systems without explicit authorization.
- [ ] P4.10 Exercise backup/restore and a documented failure drill. Restore must preserve approvals, lineage, ownership metadata, policy/budget state and deletion tombstones without resurrecting erased data.
- [ ] P4.11 Define recovery point/time objectives from the actual backend and measure them. Document power-loss durability, disaster recovery and provider-side action reconciliation limits separately.

Exit gate: real topology passes the agreed failure matrix; each uncertain action is
recoverable through a documented reconciliation procedure, never silently repeated.
Host operator runbooks and retained run IDs must support actual incident handling.

## 10. Phase 5: Isolation, Privacy And Complete Deletion

- [ ] P5.1 Bind tenant and actor identity from authenticated host context through run access, tools, memory, retrieval, vectors, artifacts, approvals, exports and callbacks. Never trust an arbitrary caller-supplied tenant ID as authentication.
- [ ] P5.2 Deny cross-tenant reads, guessed IDs, namespace overrides, malicious metadata filters, shared-cache collisions, delegated privilege escalation and post-reconnect scope changes.
- [ ] P5.3 Test isolation in actual Pinecone, Qdrant and pgvector resources, including identical record IDs in different tenants, scoped deletion and backend misconfiguration. Validate direct underlying-client access remains privileged.
- [ ] P5.4 Enforce least-privilege provider/tool/database/object-store credentials, controlled secret rotation, outbound destination rules, TLS and appropriate encryption-at-rest/key-management configuration in deployment.
- [ ] P5.5 Audit remote media fetch/import, redirects, DNS/private-address rebinding, signed URLs, uploads, path/symlink traversal, shell/file tools and plugin/MCP boundaries. Logical scope wrappers are not network or process sandboxes.
- [ ] P5.6 Create a deletion/retention inventory covering active and archived conversation, working/profile/policy/episodic/semantic memory, vectors, runs, jobs, artifacts, caches, traces, logs, exports, summaries and replicas/backups.
- [ ] P5.7 Implement authenticated deletion requests and awaited completion/failure reporting for every package-owned copy, with tombstones or equivalent restore controls for asynchronously managed copies.
- [ ] P5.8 Test deletion while work is running: cancel/coordinate affected work so late writes, queued jobs, imports or retried callbacks cannot recreate erased data.
- [ ] P5.9 Verify post-deletion queries and retrieval, artifact URLs, restored backups and replicas cannot reveal erased data outside the agreed retention/restore policy.
- [ ] P5.10 Document provider-side retention/deletion limitations and obtain actual account/configuration evidence. A local delete cannot promise deletion from a third party's training, logging or backup systems.
- [ ] P5.11 Define legal-hold/conflicting-retention handling with the deployment owner; never report complete erasure while a retained copy remains without disclosure.
- [ ] P5.12 Test redaction and egress against seeded synthetic secrets across errors, metrics, callbacks, webhooks, inspection, debug modes and exports; preserve useful diagnosis without disclosing content by default.

Exit gate: zero observed unauthorized cross-tenant disclosures in the approved test
matrix; complete inventory and evidence-backed deletion results, including explicit
time bounds and limitations. No blanket claim of protection against all possible attacks.

## 11. Phase 6: Performance, Soak And Operational Readiness

- [ ] P6.1 Define realistic small/typical/large profiles for prompt length, tool loops, memory/RAG size, vector cardinality, media sizes, active sessions and concurrent workers.
- [ ] P6.2 Set p50/p95/p99 latency, throughput, memory/CPU, queue growth, error-rate, spend and retention/deletion objectives for each accepted profile before benchmarks run.
- [ ] P6.3 Benchmark runtime overhead separately from vendor inference/network time; publish workload, hardware, versions, dataset size, warm/cold state and measurement methodology.
- [ ] P6.4 Test at agreed target load, burst load and overload; enforce bounded queues, concurrency, retries, input/media size and graceful rejection rather than uncontrolled resource growth.
- [ ] P6.5 Run at least a two-hour representative soak and an agreed extended soak (initial target: 24 hours), checking memory/file/socket/worker leaks, ledger growth and cost drift.
- [ ] P6.6 Measure vector search/filter/deletion behavior and query plans/indexes at realistic cardinalities. Do not infer cloud performance from a mocked client or local linear scan.
- [ ] P6.7 Exercise downstream slowdowns, provider degradation and budget exhaustion while maintaining tenant fairness and preserving policy/approval semantics.
- [ ] P6.8 Verify alerts and operator procedures for uncertain actions, stuck jobs, stalled deletion, stale ownership, drift, quota/billing incidents and failed artifact import.
- [ ] P6.9 Test supported-version upgrades, state/schema migration and rollback on realistic saved data; define handling for irreversible data migrations and external actions.

Exit gate: no unexplained SLO miss, unbounded growth or unresolved leak at the accepted
load; measured recovery and graceful-overload behavior; named operational owners.
Do not turn a benchmark on one machine into a universal performance guarantee.

## 12. Phase 7: Independent Security Review And Retest

Agent-authored tests and threat modeling are preparation, not independent assurance.
A reviewer outside the implementation work must assess the agreed release candidate.
Report scope matters: a package review does not automatically assess a platform's
identity, network, hosting or regulatory suitability.

- [ ] P7.1 Select and engage an independent qualified reviewer; agree on code/deployment scope, authorization, test windows, disclosure rules, protected data, deliverables and retest.
- [ ] P7.2 Supply pinned source/dependencies, build artifacts, architecture/data flows, threat model, matrix, access model, test evidence, SLOs, known risks and controlled staging accounts.
- [ ] P7.3 Request review of authorization/tenant isolation, secrets, provider egress, tools/MCP/plugins, prompt-injection escalation, SSRF/file/shell boundaries, state tampering, approvals/replay, artifact import, realtime transport and deletion/recovery behavior.
- [ ] P7.4 Include dependency/supply-chain, build/package contents, supported versions, unsafe defaults, DoS/resource limits and operational misconfiguration exposure.
- [ ] P7.5 Triage findings with severity, reproducibility, scope, owner and deadline; implement fixes with regression tests linked to finding IDs.
- [ ] P7.6 Have the independent reviewer retest fixes on the final candidate. Do not substitute agent assertions that a reported issue is fixed.
- [ ] P7.7 Close all critical/high findings; document owner-accepted lower risks with remediation dates, compensating controls and expiration/review requirements.
- [ ] P7.8 Obtain the final scoped report/retest statement and an accurate publishable summary approved for disclosure. Record exclusions and residual risks without claiming universal security or automatic compliance.

Exit gate: independent assessment and retest are actually delivered, not merely
requested or scheduled. If reviewer access or availability is missing, this phase
is externally blocked and the overall plan is not complete.

## 13. Phase 8: Release Candidate And Final Acceptance

- [ ] P8.1 Pin a candidate source revision and lockfile; reproduce the build/install/package on the supported clean environments and inspect exports/types/example availability.
- [ ] P8.2 Run all mandatory offline, provider/model, realtime, vector, deployment, fault, deletion, performance and security regression cases against that same candidate.
- [ ] P8.3 Aggregate evidence by accepted matrix tuple/profile; reject missing artifacts, stale results, failed/required-skipped cases and unsupported claims. Protect evidence authenticity/access as appropriate.
- [ ] P8.4 Ensure changes after independent review are re-reviewed/retested according to impact; do not ship a materially different candidate under an older report.
- [ ] P8.5 Reconcile README, capability maps, types, catalog, support matrix, migration notes, examples and readiness status with measured support, including explicit limitations.
- [ ] P8.6 Finalize security reporting, supported-version/patch policy, deprecation policy, changelog and appropriate semver for compatibility changes.
- [ ] P8.7 Verify tarball/license/dependency contents and secret scans, including private media/job evidence exclusion; do not commit credentials or raw customer traces.
- [ ] P8.8 Obtain package/deployment owner acceptance, independent review closure and a tested rollback/incident-response procedure. Publishing is a separate explicit user authorization.

## 14. Commands And Planned Harnesses

Existing commands, verified as repository entry points when this plan was written:

```sh
npm run test:foundation
npm audit --omit=dev
npm audit
npm pack --dry-run
npm run test:certify:preflight
npm run test:certify:vectors:preflight
```

Existing explicitly live/billable commands, only after budget/resource authorization:

```sh
npm run test:certify:providers
npm run test:certify:expanded
npm run test:certify:vectors
```

The existing expanded suite is smoke coverage, not completion of P2/P3/P4/P5.
Add new matrix-driven runtime, realtime, recovery, privacy/deletion, performance,
soak and evidence-aggregation harnesses during the relevant phases. Names and command
lines must be documented when implemented; this file does not invent runnable commands.
Provide one final readiness entry point that reports every required gate and fails
closed for missing evidence. It must consume a genuine external-review result rather
than generate one from booleans or a locally assigned "certified" label.

## 15. Evidence And Blocker Record Templates

Use this record for each task or tuple; store no secret values:

```text
Task / tuple ID:
State and owner:
Dependency / blocker:
Accepted matrix and deployment profile version:
Source revision and dependency lock hash:
Implementation / test references:
Executed command and UTC timestamp:
Measured result, sample size, failures, skips and cost:
Sanitized evidence URI / content hash:
Residual risk / limitation:
Next action and authorized decision needed:
Independent reviewer reference where required:
```

A blocker must say what cannot proceed and why, which tasks can still proceed,
the minimum missing access/approval/resource, who owns it and what test will resolve
it. Do not request raw secret values through chat. Do not label external dependencies
as completed merely because code to test them exists.

## 16. Final Completion Checklist

- [ ] F1 All mandatory phase tasks are verified or have an explicitly owner-approved scope change; no silent exclusions.
- [ ] F2 Every accepted provider/model/modality/transport tuple has current non-skipped live and runtime evidence.
- [ ] F3 Accepted realtime voice/video profiles meet agreed interruption, reconnect, privacy, buffer and latency targets end-to-end.
- [ ] F4 Actual deployment passes the recovery/ownership/approval/budget/side-effect fault matrix and restore drill.
- [ ] F5 Actual deployment passes tenant isolation and full-copy retention/deletion tests, including late writers and restore behavior.
- [ ] F6 Target load and soak profiles meet pre-agreed objectives without unbounded resource growth or unresolved leaks.
- [ ] F7 Independent security assessment and retest cover the final candidate; no open critical/high findings remain.
- [ ] F8 Evidence is complete, reproducible, appropriately protected and tied to the exact candidate/profile.
- [ ] F9 Documentation/types/package claims match the verified matrix; migration, patch and incident procedures exist.
- [ ] F10 The owner accepts the scoped release and remaining explicitly documented limitations.

Only after F1-F10 pass may the agent report: "The agreed production-readiness scope
is complete for the named release matrix and deployment profile." It must still not
claim the package is universally rock solid, flawless, secure against every attack,
or certified for providers/models/modalities that were not assessed.
