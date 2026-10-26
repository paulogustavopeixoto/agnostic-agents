const Ajv = require('ajv');
const { createPublicKey, verify } = require('crypto');
const { SchemaSafety } = require('../src/runtime/SchemaSafety');
const schema = require('../docs/readiness-evidence.schema.json');
const validateSchema = new Ajv({ strict: true, allErrors: true }).compile(schema);
const safety = new SchemaSafety({ maxNodes: 50000 });

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort()
    .map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function signingPayload(record) {
  const { attestation, ...payload } = record;
  return Buffer.from(canonical({ ...payload, attestation: {
    algorithm: attestation.algorithm, keyId: attestation.keyId,
  } }));
}

/** Shape/consistency/signature validation, NOT proof that tests or a review occurred. */
function validateEvidence(record, { reviewerKeys = {}, ownerKeys = {} } = {}) {
  try { safety.assertValue(record); }
  catch { return { valid: false, errors: ['Evidence is not bounded JSON.'] }; }
  if (!validateSchema(record)) return { valid: false, errors: validateSchema.errors.map(error => `${error.instancePath || '/'}: ${error.keyword}`) };
  const errors = [];
  const dates = [record.startedAt, record.finishedAt].map(value => new Date(value));
  if (dates.some((date, index) => !Number.isFinite(date.getTime()) || date.toISOString() !== [record.startedAt, record.finishedAt][index]) ||
      dates[1] < dates[0]) errors.push('Evidence timestamps are invalid.');
  const tests = record.tests;
  if (![tests.total, tests.passed, tests.failed, tests.skipped, tests.requiredSkipped].every(Number.isSafeInteger) ||
      tests.total !== tests.passed + tests.failed + tests.skipped || tests.requiredSkipped > tests.skipped) {
    errors.push('Evidence test accounting is inconsistent.');
  }
  if (record.outcome === 'passed' && (tests.failed || tests.requiredSkipped)) errors.push('Required failures/skips cannot be passing evidence.');
  if (['live', 'runtime', 'fault', 'load', 'soak', 'contract'].includes(record.mode) && record.outcome === 'passed' && tests.passed === 0) {
    errors.push('A test-mode pass requires executed passing assertions.');
  }
  if (record.mode === 'live' && !record.environment.tupleId) errors.push('Live evidence requires an exact tuple ID.');
  if (record.mode === 'independent-review' && !record.review) errors.push('Independent review requires scoped report and retest references.');
  if (['independent-review', 'owner-acceptance'].includes(record.mode)) {
    const trusted = record.mode === 'independent-review' ? reviewerKeys : ownerKeys;
    const attestation = record.attestation;
    if (!attestation || !Object.hasOwn(trusted, attestation.keyId)) errors.push('No externally trusted attestation key is configured.');
    else try {
      const key = createPublicKey(trusted[attestation.keyId]);
      if (key.asymmetricKeyType !== 'ed25519' || !verify(null, signingPayload(record), key, Buffer.from(attestation.signature, 'base64'))) {
        errors.push('Attestation signature is invalid.');
      }
    } catch { errors.push('Attestation signature could not be verified.'); }
  }
  return { valid: errors.length === 0, errors };
}
module.exports = { validateEvidence, signingPayload };
