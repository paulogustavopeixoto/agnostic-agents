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

  test('reference queue worker example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceQueueWorker.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Queued envelope');
    expect(stdout).toContain('Remote worker result');
    expect(stdout).toContain("stage: 'replay'");
  });

  test('reference distributed incident example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceDistributedIncident.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Distributed incident report');
    expect(stdout).toContain('Correlation metadata');
    expect(stdout).toContain('destinationWorker');
  });

  test('reference remote control plane example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceRemoteControlPlane.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Governance requests');
    expect(stdout).toContain('Event sink requests');
    expect(stdout).toContain('waiting_for_approval');
    expect(stdout).toContain('completed');
  });

  test('reference deployment split example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceDeploymentSplit.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('API run status');
    expect(stdout).toContain('Control-plane governance events');
    expect(stdout).toContain('Worker run summary');
    expect(stdout).toContain('waiting_for_approval');
    expect(stdout).toContain('completed');
  });

  test('reference distributed recovery example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceDistributedRecovery.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Distributed recovery plan');
    expect(stdout).toContain('Executed recovery action');
    expect(stdout).toContain('recommendedAction');
    expect(stdout).toContain('branch_from_failure_checkpoint');
  });
});
