# Readiness Evidence

The versioned [JSON schema](readiness-evidence.schema.json) records task IDs,
source and dependency hashes, dirty-tree status, environment/profile/tuple,
timestamps, command, test counts and skips, artifact hashes and measurements.
Record spend and failure classification in measurements when applicable.
Never include credentials, private customer content or raw production traces.

Repository tooling in `scripts/readinessEvidence.js` exports `validateEvidence`.
Run `npm test -- --runInBand tests/readiness-evidence.unit.test.js` to verify its
bounded parsing, timestamp/accounting checks and attestation behavior.
The tooling is not a runtime SDK API or a complete production acceptance gate.

A passing record cannot contain failed assertions or required skipped tests.
Live evidence requires an exact tuple ID. Independent-review records require
report/retest references and an Ed25519 signature from a reviewer key supplied
out of band. Owner acceptance uses a separate trusted key map. Test keys in unit
fixtures are not reviewer credentials or actual review evidence.

Validation checks format, consistency and configured signatures only. It does not
execute tests, fetch artifacts, verify their contents against hashes, establish
reviewer independence, or prove that a claimed review happened. The owner must
authenticate reviewers and approved keys independently, inspect source identity
including uncommitted changes, verify artifacts, and apply every final plan gate.
No self-issued report or signature substitutes for an independent review.
