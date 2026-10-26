const { spawnSync } = require('child_process');
const { targets, preflight, verifyLiveCall } = require('../scripts/certifyProviders');

test('initial provider matrix is explicit and all targets require credentials and model IDs', () => {
  expect(targets).toHaveLength(10);
  expect(targets.map(target => target.id)).toEqual(expect.arrayContaining(['openai', 'huggingface', 'higgsfield']));
  expect(preflight({}).every(check => check.missing.length >= 2)).toBe(true);
  const env = Object.fromEntries(targets.flatMap(target => target.requiredEnv.map(key => [key, 'private-key'])));
  expect(preflight(env).every(check => check.missing.length === 0)).toBe(true);
  expect(JSON.stringify(preflight(env))).not.toContain('private-key');
});

test('preflight is offline and missing configuration blocks certification before Jest starts', () => {
  const env = { ...process.env, ...Object.fromEntries(targets.flatMap(target => target.requiredEnv.map(key => [key, '']))) };
  const check = spawnSync(process.execPath, ['scripts/certifyProviders.js', '--check'], { env, encoding: 'utf8' });
  expect(check.status).toBe(0);
  expect(JSON.parse(check.stdout).liveCallsMade).toBe(false);
  const blocked = spawnSync(process.execPath, ['scripts/certifyProviders.js'], { env, encoding: 'utf8' });
  expect(blocked.status).toBe(1);
  expect(blocked.stderr).toContain('Certification blocked');
  expect(blocked.stdout).not.toContain('Test Suites:');
  const expanded = spawnSync(process.execPath, ['scripts/certifyProviders.js', '--all'], { env, encoding: 'utf8' });
  expect(expanded.status).toBe(1);
  expect(JSON.parse(expanded.stdout).liveSuite).toBe('ten-provider-smoke');
});

test('vector preflight reports missing drivers/configuration without disclosing connection strings', () => {
  const { preflight: checkVectors } = require('../scripts/certifyVectors');
  const checks = checkVectors({ PGVECTOR_DATABASE_URL: 'postgres://private-secret' }, () => { throw new Error('missing'); });
  expect(checks).toHaveLength(3);
  expect(checks.every(check => check.driverAvailable === false)).toBe(true);
  expect(JSON.stringify(checks)).not.toContain('private-secret');
  expect(checks.find(check => check.id === 'pgvector').missing).not.toContain('PGVECTOR_DATABASE_URL');
});

test('preflight rejects invalid media inputs and vector dimensions without service calls', () => {
  const media = preflight({ HIGGSFIELD_TEST_OPERATION: 'deleteAll', HIGGSFIELD_TEST_INPUT_JSON: 'private-secret',
    HIGGSFIELD_TEST_MIME_TYPE: 'audio/wav' }).find(check => check.id === 'higgsfield');
  expect(media.invalid).toEqual(expect.arrayContaining(['HIGGSFIELD_TEST_OPERATION', 'HIGGSFIELD_TEST_INPUT_JSON', 'HIGGSFIELD_TEST_MIME_TYPE']));
  expect(JSON.stringify(media)).not.toContain('private-secret');
  const { preflight: vectors } = require('../scripts/certifyVectors');
  expect(vectors({ PGVECTOR_TEST_DIMENSIONS: '-1' }, () => 'driver').find(check => check.id === 'pgvector').invalid)
    .toEqual(['PGVECTOR_TEST_DIMENSIONS']);
});

test.each(['quota exhausted private-key', 'billing failed private-key', 'model unavailable private-key'])(
  'provider failure never becomes passing evidence (%s)', async message => {
    const error = Object.assign(new Error(message), { status: 429 });
    await expect(verifyLiveCall(async () => { throw error; })).rejects.toThrow('No passing evidence');
    try { await verifyLiveCall(async () => { throw error; }); }
    catch (failure) { expect(failure.message).not.toContain('private-key'); }
  });
