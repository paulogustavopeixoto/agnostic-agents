# Production Threat Model And Data Inventory

Status: initial engineering threat model for P0.7, not an independent review.
Scope: package/runtime boundaries plus the reference host interfaces that must be
verified before shared customer use. Revisit when the release/deployment matrix changes.

## Assets And Trust Boundaries

Protected assets include provider/service secrets, user/tenant content, system/policy
instructions, approvals, budgets, state integrity, vector metadata, private media,
audit/evaluation evidence, and control of external side effects.

An authenticated host binds actor/tenant identity and policy. Models, retrieved text,
tool/service responses and media metadata are untrusted content, not authorization.
Host callbacks, custom tools/providers, store clients and plugin code execute with
application privileges unless the host isolates them. The runtime is not a sandbox
for arbitrary JavaScript and cannot stop an unrestricted callback reading host secrets.

External boundaries are host-to-provider, host-to-tool/MCP, host-to-storage, host-to-CDN
and remote realtime peers. Persistence is privileged state, not proof of user consent.
Inspector/export/webhook paths are separate disclosure paths from the model prompt.

## Threat And Verification Map

| ID | Threat | Required controls and verification | Current assurance |
| --- | --- | --- | --- |
| T01 | Forged tenant IDs, guessed run/artifact IDs, filter overrides | Host authentication, scoped storage/retrieval, pre-load checks, negative tests on actual backends | Local contracts exist; deployment verification pending |
| T02 | Prompt/RAG/tool injection causing privileged action or disclosure | Data/instruction separation, host policy before egress/action, approvals/verifiers, adversarial fixtures and scoped delegation | Hooks exist; complete real-model/deployment evidence pending |
| T03 | Modified stored approval/state or approval replay | Protected state, action/scope/schema binding, authenticated decisions, atomic single-use consumption, ownership/fencing | HMAC/locks/crash fixtures exist; transactional deployment pending |
| T04 | Duplicate external actions after timeout/crash/reconnect | Stable service idempotency keys, persisted dispatch intent, non-retryable uncertainty and explicit reconciliation | Package fixtures exist; service-side enforcement pending |
| T05 | SSRF, redirect/DNS rebinding, credential forwarding via media URLs | Host network restrictions, approved destinations, address validation, bounded reads, no provider credentials sent to CDN | Fixed-origin connectors exist; actual import/network audit pending |
| T06 | File/shell/plugin/MCP privilege escape | Host sandbox/least privilege, typed contracts, schema bounds, safe paths, controlled credentials and transport lifecycle | Some guards exist; unrestricted host code remains privileged |
| T07 | Raw content/secrets in traces/logs/errors/exports | Metadata-only defaults where supported, redaction, limited retention/access, seeded-secret tests across every sink | Local coverage exists; full deployment corpus pending |
| T08 | DoS and runaway spend/loops/buffers | Byte/node/frame/call/time/concurrency limits, conservative reservations, backpressure and overload tests | Per-operation controls exist; distributed accounting/load evidence pending |
| T09 | Stale realtime output, duplicate tool events, unsafe reconnect | Epoch/sequence handling, remote cancel/truncate, bounded replay, turn state and authorization revalidation | Generic transport fixtures only; vendor end-to-end pending |
| T10 | Erased data recreated or restored | Complete copy inventory, late-writer coordination, tombstones, authenticated deletion, backup/restore checks | Layer deletion fixes/local vectors exist; full-copy acceptance pending |
| T11 | Backend client ignores scope/filter or exposes its privileged API | Backend conformance, mandatory server-side scope, post-checks, restricted backing credentials/API exposure | Mocked client contracts exist; cloud/deployment proof pending |
| T12 | Supply-chain/build/package compromise or stale runtime dependencies | Locked dependencies, supported runtimes, audits/scans, controlled CI/signing, tarball inspection and patch policy | Current audits must be recorded; independent supply-chain review pending |
| T13 | Forged or incomplete evaluation/security evidence | Fail-closed required-case accounting, source/environment binding, private artifacts, provenance and genuinely independent review | Local missing-evidence guards exist; final evidence gate pending |
| T14 | Provider-side retention/model drift/account restrictions | Exact tuple/config evidence, retention agreements/settings, revalidation triggers and constrained fallback | Account/provider evidence outstanding |

## Data Inventory And Deletion Responsibilities

| Data/copy | Creation/use | Owner and deletion/retention obligation |
| --- | --- | --- |
| Credentials/signing keys | Host configuration and outbound authentication | Host vault/rotation/access controls; never embed in prompts/evidence |
| User/system/conversation content | Agent input, active context and run messages | Package supports storage hooks; host authorizes access, retention and redaction |
| Working/profile/policy memory | Layer stores and active process state | Await persistent deletion; policy changes require privileged authority |
| Conversation archives and episodic memory | Optional history/provenance | Include historical copies, TTL cleanup and restoration in deletion scope |
| Embeddings/semantic memory/vector metadata | Model embedding egress, local or service vectors | Treat as sensitive derived data; verify namespace/filter/deletion on the real service |
| Summaries/retrieval caches | Context compaction and reuse | Track provenance and scope; erasing the source alone does not erase derived copies |
| Raw media and artifact metadata | Production/import, object storage and playback | Host owns codec/size checks, private storage, URL lifecycle, versions/hashes and deletion |
| Run/job/checkpoint/approval records | Recovery, review, audit and side-effect reconciliation | Protected state; explicit retention versus audit/legal-hold decisions |
| Traces/logs/webhooks/exports/debug dumps | Inspection and operational diagnosis | Independent access/redaction/retention controls, including external observability vendors |
| Replicas/backups/disaster-recovery copies | Durability and restore | Host retention/tombstone/restore policy; prevent deleted content from reappearing |
| Provider/tool/CDN retained copies | External processing and delivery | Actual account/contract settings and limits; local erasure cannot guarantee remote erasure |
| Test/security evidence | Verification and independent retest | Synthetic datasets by default; private raw artifacts and sanitized summaries/hashes |

## Abuse Fixtures To Implement

- Tenant A attempts guessed IDs, namespace overrides, replay and delegated access to tenant B.
- Retrieved text/tool output requests secrets, changes approvals or reclassifies a risky action as safe.
- A service supplies private-network/redirecting/signed media URLs; no provider credential may follow them.
- A callback/stream hangs or floods output while another tenant works; bounds and fairness must hold.
- Approval/state/model versions change during resume; consume only the exact authorized contract.
- Worker failure occurs at every external action boundary; uncertainty never authorizes blind replay.
- A deletion overlaps media generation, vector upsert, memory write and backup restoration.
- Realtime reconnect/interrupt races deliver old frames or repeated tool actions; reject stale work.
- Debug/error/export paths receive seeded synthetic secrets and binary payloads; test every sink.

## Non-Claims And Review Work

This model does not establish compliance, enterprise readiness, universal resistance
to prompt injection, exactly-once external actions, zero provider retention or secure
execution of arbitrary extensions. The independent reviewer must challenge these
boundaries, reproduce findings and retest fixes on the final candidate. Owner-approved
staging, test limits and disclosure rules are required before intrusive testing.
