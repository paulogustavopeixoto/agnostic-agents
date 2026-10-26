# Agent Security Boundaries

## Assurance Status

The runtime is not independently security-certified. Passing tests and a clean
production dependency audit do not establish isolation, regulatory compliance,
or protection against all data leakage. Current guarantees are specific to the
interfaces and configurations tested below.

## Outbound Observability

WebhookEventSink now defaults to metadata-only delivery: event ID, type, timestamp,
run ID, and status. Event payloads, custom event fields, and run metadata are excluded.
Do not put private data into identifiers, event types, or timestamps.

Applications migrating from full webhook payloads must explicitly set
`captureContent: true`. Captured content passes through RuntimeEventRedactor.
The redactor masks sensitive field names, Basic/Bearer strings, credential-bearing
URLs, configured literal secrets, binary values, cycles, and excessive nesting.
It returns a new object instead of modifying execution state.

```js
const { WebhookEventSink, RuntimeEventRedactor } = require('agnostic-agents');

const sink = new WebhookEventSink({
  endpoint: 'https://observability.example/events',
  // Keep captureContent omitted for metadata-only delivery.
  redactor: new RuntimeEventRedactor({
    secrets: [process.env.TOOL_API_KEY].filter(Boolean),
  }),
});
```

Redaction is defense in depth, not general PII detection or a prompt-injection
defense. Names, financial details, arbitrary document text, transformed secrets,
and sensitive object keys can remain. Avoid content capture for sensitive workloads
unless an application-specific disclosure policy permits it. Destination selection,
transport credentials, egress controls, retention, and access to the receiving
service are controlled by the host.

## Execution State And Other Sinks

Optional GuardedProvider, ScopedRetriever, ScopedLayerStore, ScopedRunStore, and
ArtifactResolver now provide tested host-controlled gates and logical scope checks.
They must be wired into each relevant path; an unwrapped provider or raw store is
not protected by another component's guard. See the [foundation guide](foundation-guide.md).

Approval requests now expire, and authorizeResume can enforce host-authenticated
review. Async/malformed tool-policy results fail closed. Risky tool retries require
explicit idempotent/retryable declarations. None of these controls authenticates
identities, signs records, or establishes distributed single-use execution by itself.

Run stores, checkpoints, trace exports, memory stores, Agent onEvent callbacks,
governance callbacks, and custom event sinks can receive raw execution content.
Webhook minimization does not sanitize these other paths or alter model inputs.
FileAuditSink and ConsoleDebugSink still require `piiSafe: true` to use redaction.
WebhookGovernanceAdapter is a separate path and is not covered by WebhookEventSink
minimization. Treat all these interfaces as privileged until individually reviewed.

The host must enforce storage access, encryption, retention, and deletion. Redacting
durable checkpoints indiscriminately can break recovery; use protected execution
storage and separately minimized diagnostic exports.

## Trust Boundaries Still Requiring Work

ToolSandboxRunner no longer invokes a real tool when simulation has no simulator.
Only simulate and dry_run modes are accepted; simulate requires an explicit
simulator. A supplied simulator is trusted host code and is not an OS sandbox.

- Bind tenant, user, and resource scope to authenticated host context. Never accept model-produced identity as authorization.
- Apply document and memory access checks before retrieval or model submission, not only before displaying results.
- Enforce provider/model egress policy before prompts, retrieved context, media, or tool results leave the host.
- Resolve secrets outside prompts and model-visible tool arguments. Limit credential scope and lifetime.
- Enforce tool permissions independently of descriptions and model instructions. Isolate file, network, browser, and shell execution at the host boundary.
- Check artifact ownership, content size, destination, and retention when resolving media references.
- Bind approvals to authenticated approvers and exact actions; validate restored approvals and expiration.
- Treat ambiguous external-action outcomes as uncertain; do not blindly retry writes after a crash.
- Exercise cross-tenant access, prompt injection, SSRF, traversal, malicious schemas, trace leakage, and crash recovery in behavioral tests.

These are outstanding acceptance criteria. Metadata-only policy, certification,
attestation, and chaos helpers do not substitute for enforcement or independent testing.
