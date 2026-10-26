const { spawnSync } = require('child_process');
const targets = [
  { id: 'pinecone', driver: '@pinecone-database/pinecone', requiredEnv: ['PINECONE_API_KEY', 'PINECONE_TEST_INDEX', 'PINECONE_TEST_DIMENSIONS'] },
  { id: 'qdrant', driver: '@qdrant/js-client-rest', requiredEnv: ['QDRANT_TEST_URL', 'QDRANT_TEST_COLLECTION', 'QDRANT_TEST_DIMENSIONS'] },
  { id: 'pgvector', driver: 'pg', requiredEnv: ['PGVECTOR_DATABASE_URL', 'PGVECTOR_TEST_TABLE', 'PGVECTOR_TEST_DIMENSIONS'] },
];
function preflight(env, resolve = require.resolve) {
  return targets.map(target => {
    let driverAvailable = false;
    try { resolve(target.driver); driverAvailable = true; } catch {}
    const dimensionKey = `${target.id.toUpperCase()}_TEST_DIMENSIONS`;
    const dimensions = Number(env[dimensionKey]);
    const invalid = env[dimensionKey] && (!Number.isSafeInteger(dimensions) || dimensions < 1 || dimensions > 16000) ? [dimensionKey] : [];
    return { id: target.id, driver: target.driver, driverAvailable, invalid,
      missing: target.requiredEnv.filter(key => typeof env[key] !== 'string' || !env[key].trim()) };
  });
}
function main() {
  if (process.argv.slice(2).some(arg => arg !== '--check')) {
    process.stderr.write('Unknown option. Use --check for offline vector inspection.\n');
    return 1;
  }
  require('dotenv').config();
  const checks = preflight(process.env);
  process.stdout.write(`${JSON.stringify({ vectorStores: checks, liveCallsMade: false }, null, 2)}\n`);
  if (process.argv.includes('--check')) return 0;
  if (checks.some(check => !check.driverAvailable || check.missing.length || check.invalid.length)) {
    process.stderr.write('Vector verification blocked: configure dedicated test resources and install optional host drivers.\n');
    return 1;
  }
  const result = spawnSync(process.execPath, [require.resolve('jest/bin/jest'), '--runInBand', 'tests/live/vector-backends.live.test.js'], {
    cwd: require('path').resolve(__dirname, '..'), stdio: 'inherit', env: { ...process.env, RUN_LIVE_VECTOR_TESTS: '1' },
  });
  return result.status ?? 1;
}
if (require.main === module) process.exitCode = main();
module.exports = { targets, preflight };
