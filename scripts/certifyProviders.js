const { spawnSync } = require('child_process');
const { ProviderCatalog } = require('../src/llm/ProviderCatalog');

const targets = ProviderCatalog.list();

function preflight(env) {
  return targets.map(target => {
    const invalid = [];
    if (target.integration === 'job-backend') {
      const prefix = target.id.toUpperCase();
      const operation = env[`${prefix}_TEST_OPERATION`];
      if (operation && !['generateImage', 'generateVideo'].includes(operation)) invalid.push(`${prefix}_TEST_OPERATION`);
      const mimeType = env[`${prefix}_TEST_MIME_TYPE`];
      if (mimeType && !mimeType.startsWith(operation === 'generateVideo' ? 'video/' : 'image/')) invalid.push(`${prefix}_TEST_MIME_TYPE`);
      const raw = env[`${prefix}_TEST_INPUT_JSON`];
      if (raw) try {
        if (Buffer.byteLength(raw) > 1048576) throw new Error('limit');
        const input = JSON.parse(raw);
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('shape');
      } catch { invalid.push(`${prefix}_TEST_INPUT_JSON`); }
    }
    return { id: target.id, primaryTextSmoke: target.primaryTextSmoke, invalid,
      missing: target.requiredEnv.filter(key => typeof env[key] !== 'string' || !env[key].trim()) };
  });
}

async function verifyLiveCall(invoke) {
  try { return await invoke(); }
  catch (error) {
    const status = Number.isInteger(error?.status) ? ` (HTTP ${error.status})` : '';
    throw new Error(`Live provider verification failed${status}; check credentials, model access, quota, and adapter behavior. No passing evidence was produced.`);
  }
}

function main(args = process.argv.slice(2)) {
  if (args.some(arg => !['--all', '--check'].includes(arg))) {
    process.stderr.write('Unknown option. Use --check for offline inspection and --all for expanded live smoke.\n');
    return 1;
  }
  require('dotenv').config();
  const expanded = args.includes('--all');
  const checks = preflight(process.env);
  // Never print credential values or model/provider error bodies.
  process.stdout.write(`${JSON.stringify({ phase: 'preflight', targets: checks, vectorStores: ProviderCatalog.vectorStores(),
    liveCallsMade: false, liveSuite: expanded ? 'ten-provider-smoke' : 'primary-text-smoke-only' }, null, 2)}\n`);
  if (args.includes('--check')) return 0;
  if (checks.some(check => (expanded || check.primaryTextSmoke) && (check.missing.length || check.invalid.length))) {
    process.stderr.write('Certification blocked: configure every required value for the selected smoke suite. Missing configuration is not passing evidence.\n');
    return 1;
  }
  const testArgs = expanded ? ['tests/live/adapters.live.test.js', 'tests/live/provider-expansion.live.test.js'] :
    ['tests/live/adapters.live.test.js', '--testNamePattern=OpenAI|Anthropic|Gemini'];
  const result = spawnSync(process.execPath, [require.resolve('jest/bin/jest'), '--runInBand', ...testArgs], {
    cwd: require('path').resolve(__dirname, '..'), stdio: 'inherit',
    env: { ...process.env, RUN_LIVE_API_TESTS: '1', RUN_LIVE_EXTENDED_TESTS: expanded ? '1' : '0' },
  });
  return result.status ?? 1;
}

if (require.main === module) process.exitCode = main();
module.exports = { targets, preflight, verifyLiveCall };
