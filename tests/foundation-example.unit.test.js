const { execFileSync } = require('child_process');
const path = require('path');

test('offline scoped multimodal example composes the public runtime contracts', () => {
  const output = execFileSync(process.execPath,
    [path.join(__dirname, '../examples/referenceScopedMultimodalAgent.js')], { encoding: 'utf8', timeout: 15000 });
  const summary = JSON.parse(output);
  expect(summary.status).toBe('completed');
  expect(summary.childStatus).toBe('completed');
  expect(summary.runCount).toBe(2);
  expect(summary.sources).toBe(1);
  expect(summary.artifactBytes).toBeGreaterThan(0);
});
