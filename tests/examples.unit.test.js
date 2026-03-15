const { execFile } = require('child_process');
const path = require('path');
const util = require('util');

const execFileAsync = util.promisify(execFile);

describe('Maintained examples', () => {
  test('local tool example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'localToolExample.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Final answer');
    expect(stdout).toContain('84');
  });

  test('local RAG example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'localRagExample.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Grounded answer');
    expect(stdout).toContain('Retrieved context');
  });

  test('local RAG + tool example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'localRagToolExample.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Grounded answer using retrieved context and tool result');
    expect(stdout).toContain('forecast');
    expect(stdout).toContain('Retrieved context');
  });
});
