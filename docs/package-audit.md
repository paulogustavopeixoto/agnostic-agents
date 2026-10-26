# Package Audit

## Foundation Review

Dependency verification for this update: compatible fixes clear production advisories
(`npm audit --omit=dev`). The full audit still reports 28 high-severity affected
development packages through the Jest/micromatch/braces dependency chain. npm's
suggested forced Jest downgrade was not applied. This requires a separate test
toolchain migration or a verified upstream fix; production audit clearance does
not mean the entire repository is vulnerability-free.

The producer foundation adds opt-in inspectable multimodal execution. It is not a
completed security audit or a replacement for the existing Agent execution path.

Current local verification also covers signed single-use approvals, conservative
resource reservations, shared-filesystem run locks, schema safety, scoped episodic/
vector memory, direct tool execution, realtime transport interruption, and API
credential separation. The latest npm dry-run contains 427 files and includes the
new provider/vector adapters, excluding .env and private run paths. A targeted credential
pattern scan found no matches and no .env files. This scan is not comprehensive
secret detection or historical Git cleanup.

New Mistral/xAI, ElevenLabs, fal/Higgsfield and Pinecone/Qdrant/pgvector integrations
have deterministic contract coverage and opt-in live suites, not fresh live evidence.
Database drivers/clients are host-injected rather than mandatory new dependencies.

Confirmed implementation gaps requiring follow-up:

- `Memory.compact()` still evicts the active view and older key/value entries;
  optional conversationStore now archives turns, while ContextWindow projects
  prompts without destroying run history and supports source-linked summaries.
  Real-model semantic retention is not established by the local fixtures.
- Legacy Agent media helpers now have metadata-only run records, authorization,
  deadlines, budgets and no automatic retries. Provider-native output conversion and
  live conformance remain; approval-gated media belongs in ProducerTool.
- Gemini video generation uses APIs unavailable on the bundled SDK. Its capability
  flag is now false, and execution checks the SDK methods before calling them.
- `FailureInjectionSuite` checks supplied booleans rather than injecting crashes;
  missing flags now fail instead of passing. Separate SIGKILL tests verify committed
  file-run persistence and termination before/after approved external side effects,
  not exhaustive recovery or exactly-once actions.
- `PolicyAutonomyAttestation` records approver names without signatures or authentication.
  Optional ApprovalSigner protects Agent action bindings, not this separate legacy
  attestation format, and does not authenticate a human by itself.
- Generic API/file/shell tools require deployment-specific permission and isolation controls.

ProducerRuntime does not fetch media, execute tools, or retry side effects. A
configured authorization gate requires explicit `true`; exceptions deny execution.
Provider errors are stored as generic failures to avoid leaking SDK credentials.
The default store is volatile, cancellation requires producer cooperation, and
artifact ownership plus sensitive-text redaction remain application responsibilities.

Older package-size results below are historical and must be regenerated for release.

## Audit command

```bash
npm run pack:audit
```

## Current result

The published tarball is constrained to the maintained public surface:

- core source under `src/`
- maintained example entry points only
- `README.md`
- `CHANGELOG.md`
- test/release documentation

Legacy or experimental examples are no longer included in the npm tarball.

## Most recent audit summary

- package name: `agnostic-agents`
- version: `1.0.39`
- tarball size: about `37 kB`
- unpacked size: about `148 kB`
- total files: `51`

## Audit goals

- keep the package focused on supported public APIs
- exclude stale examples from the published artifact
- ensure the npm tarball reflects the maintained v1 surface
