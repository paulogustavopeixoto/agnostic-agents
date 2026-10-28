# Production Readiness Execution Ledger

Status: incomplete. Offline engineering evidence is not production certification.

## Unreleased Artifact Read Hardening

ArtifactResolver adds SHA-256 verification against host metadata, optional required
integrity, immutable metadata capture, a whole-operation deadline, chunk limits,
signal propagation, bounded iterator cleanup and sanitized non-retryable failures.
Twenty-three regression cases cover valid/mismatched hashes, legacy compatibility,
same-size substitution, stalled/progressing reads, cancellation, late metadata and
non-cooperative cleanup. This advances the runtime portion of P1.3/P1.5/P2.9; private
artifact persistence, actual deployment deletion, trusted metadata management and
live asset import remain host/external verification work, not completed gates.
The full offline foundation run passes 529 tests with 14 live tests skipped,
followed by public TypeScript checks and the scoped multimodal example. Package
dry-run includes the resolver and excludes private runtime/env paths.

## Unreleased Embedding Contract Hardening

Fifteen regression cases cover the Hugging Face/RAG/semantic-memory representation
mismatch, invalid result counts, finite/dense vectors, dimensional consistency,
indexed source ordering, detached values and legacy custom-adapter compatibility.
The offline foundation run passes 506 tests; 14 live tests remain skipped. This is
partial progress on P1.1/P1.5/P2.7, not live embedding quality/model certification or
completion of all shared contracts. The published 1.3.4 release counts below are
historical release evidence; this change awaits pull-request review and release.

## Security Review Fixes - 1.3.4

R01-R14 are fixed with 25 regression tests in review-regressions.unit.test.js.
The current full foundation run passes 491 tests in 29 suites; 14 live tests
remain skipped. Public TypeScript checks and the scoped multimodal example pass.
The 1.3.4 package dry-run contains 439 files and the targeted credential/private
path scan reports no matches. The initial release audit found two high findings
in OpenAI/Zod; updating to OpenAI 6.49.0 and Zod 4.6.7 yields zero currently reported
advisories. These are release checks, not completion of the external plan gates.
Earlier counts and dependency audit results below are historical observations.

## Owner Constraints

- Paid provider, media and staging load-test budget: zero for now.
- Actual staging deployment/access/contact: none available for now.
- Independent security reviewer: owner action to arrange; no reviewer engaged.
- Exact model, realtime and deployment support profiles: draft, not approved.

No external tests or infrastructure purchases are authorized by this ledger.
Package implementation and offline verification can continue.

## Verified Engineering Work

- P0.7: initial threat model, trust boundaries and data inventory created in
  `production-threat-model.md`; this is not an independent assessment.
- P0.8: evidence schema and bounded validation helper created; four unit tests
  cover accounting, required fields, trusted-key separation and tamper detection.
  Artifact retrieval, hash verification and final acceptance remain separate.
- P1.6/P1.7: FileVectorStore exported with public types and storage guide.
  Thirteen tests cover restart/scoped CRUD/deletion, malformed snapshots, bounds,
  mocked permission/disk faults, writer exclusion, and actual child-process SIGKILL
  before write, before rename and after rename. No power-loss or distributed
  filesystem guarantee is inferred. LocalVectorStore stays in-memory; cosine
  computation now avoids overflow for large finite vector values.

## Local Verification

Observed execution: Node v23.10.0; dirty working tree based on
`81a3fea7f7816d4c7f633d066e828a41041c9cba`. This is not an approved LTS/OS matrix
or a source-hashed release certificate.

`npm run test:foundation` passed: 28 suites, 466 tests passed, 14 live tests skipped,
followed by successful strict public TypeScript checks and the scoped multimodal
example. These skipped tests cannot satisfy live acceptance requirements.

An earlier full run failed on the existing coordination diagnostics example's
five-second timeout during an unusually slow run. Its isolated rerun passed in
192 ms; the subsequent full run passed in 19.682 seconds. The initial timeout's
cause is not established; no timeout was increased to hide it.

Fresh `npm audit --json` and `npm audit --omit=dev --json` both reported zero
advisories. Earlier recorded development advisories are historical results;
no dependency remediation or explanation of registry-feed changes is claimed.
An advisory-free audit is not evidence of vulnerability-free code.

Package dry-run succeeded at version 1.3.3 with 436 files. A targeted scan of its
published text candidates found no project-key/private-key patterns, `.env` paths
or private runtime directories. This bounded pattern check is not a comprehensive
secret-detection or security review. Post-documentation focused verification passed
177 tests across package, evidence and file-vector suites; `git diff --check` passed.

## Remaining Gates

P0.1 still requires the complete release-specific source-hashed evidence bundle.
P0.2/P0.4 require owner-approved exact tuples and deployment configuration.
Live provider/vector/realtime, actual deployment recovery/isolation/deletion,
load/soak, and independent security review/retest remain unverified. All final
F1-F10 gates remain unchecked. Follow `production-readiness-plan.md`; do not
interpret these four engineering checkmarks as completion of its 100 tasks.
