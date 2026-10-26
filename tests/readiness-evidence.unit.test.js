const { generateKeyPairSync, sign } = require('crypto');
const { validateEvidence, signingPayload } = require('../scripts/readinessEvidence');
function evidence() {
  return { kind: 'agnostic-agents/readiness-evidence', version: '1.0', id: 'fixture', taskIds: ['P0.8'],
    mode: 'contract', outcome: 'passed', startedAt: '2026-10-23T10:00:00.000Z', finishedAt: '2026-10-23T10:01:00.000Z',
    source: { revision: 'a'.repeat(40), sourceHash: 'b'.repeat(64), lockHash: 'c'.repeat(64), dirty: true },
    environment: { node: 'test', platform: 'test', architecture: 'test', profileId: 'fixture-only', matrixVersion: 'draft' },
    command: 'fixture only; not real acceptance evidence', tests: { total: 2, passed: 1, failed: 0, skipped: 1, requiredSkipped: 0 },
    artifacts: [{ label: 'fixture', uri: 'private://fixture', sha256: 'd'.repeat(64) }] };
}
test('evidence validation requires bounded source/environment/artifact records and consistent test counts', () => {
  const record = evidence();
  expect(validateEvidence(record)).toEqual({ valid: true, errors: [] });
  record.tests.total = 99;
  expect(validateEvidence(record).valid).toBe(false);
  delete record.source;
  expect(validateEvidence(record).valid).toBe(false);
});
test('required skips, empty runs, invalid dates and missing live tuples cannot become acceptance evidence', () => {
  const record = evidence(); record.tests.requiredSkipped = 1;
  expect(validateEvidence(record).valid).toBe(false);
  record.tests = { total: 0, passed: 0, failed: 0, skipped: 0, requiredSkipped: 0 };
  expect(validateEvidence(record).valid).toBe(false);
  record.tests = evidence().tests; record.startedAt = '2026-02-30T10:00:00.000Z';
  expect(validateEvidence(record).valid).toBe(false);
  record.startedAt = evidence().startedAt; record.mode = 'live';
  expect(validateEvidence(record).valid).toBe(false);
});
test('unsigned or self-declared reviews are rejected; test keys demonstrate cryptography, not real independence', () => {
  const record = evidence(); record.mode = 'independent-review';
  record.review = { reviewer: 'test fixture', organization: 'not a real independent assessment',
    scopeHash: 'e'.repeat(64), reportHash: 'f'.repeat(64), retestHash: '1'.repeat(64) };
  expect(validateEvidence(record).valid).toBe(false);
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  record.attestation = { algorithm: 'Ed25519', keyId: 'fixture-only', signature: '' };
  record.attestation.signature = sign(null, signingPayload(record), privateKey).toString('base64');
  expect(validateEvidence(record).valid).toBe(false);
  const reviewerKeys = { 'fixture-only': publicKey.export({ type: 'spki', format: 'pem' }) };
  expect(validateEvidence(record, { reviewerKeys }).valid).toBe(true);
  record.review.reportHash = '2'.repeat(64);
  expect(validateEvidence(record, { reviewerKeys }).valid).toBe(false);
});
test('owner signatures cannot stand in for reviewer keys', () => {
  const record = evidence(); record.mode = 'owner-acceptance';
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  record.attestation = { algorithm: 'Ed25519', keyId: 'owner', signature: '' };
  record.attestation.signature = sign(null, signingPayload(record), privateKey).toString('base64');
  const keys = { owner: publicKey.export({ type: 'spki', format: 'pem' }) };
  expect(validateEvidence(record, { reviewerKeys: keys }).valid).toBe(false);
  expect(validateEvidence(record, { ownerKeys: keys }).valid).toBe(true);
});
