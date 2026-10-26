const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { Agent, Tool, FileRunStore, FileRunLock } = require('..');

test.each(['before', 'after'])('approval stays consumed across process death %s external dispatch', async phase => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'approval-crash-'));
  const child = spawn(process.execPath, [path.join(__dirname, 'fixtures/approvalCrashWorker.js'), directory, phase],
    { env: { NODE_ENV: 'test' }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Crash fixture startup timed out')), 10000);
      child.stdout.once('data', data => { clearTimeout(timer); data.toString() === 'READY' ? resolve() : reject(Error('Unexpected fixture output')); });
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', () => { clearTimeout(timer); reject(Error('Crash fixture exited early')); });
    });
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill('SIGKILL'); await exited;
    const store = new FileRunStore({ directory: path.join(directory, 'runs') });
    const recovered = await store.getRun('approval-crash');
    expect(recovered.pendingApproval).toBeNull();
    expect(Object.values(recovered.state.approvalConsumptions)[0].status).toBe('uncertain');
    const action = jest.fn();
    const agent = new Agent({ generateText: jest.fn() }, { runStore: store,
      runLock: new FileRunLock({ directory: path.join(directory, 'locks') }),
      tools: [new Tool({ name: 'write', implementation: action })] });
    await expect(agent.resumeRun(recovered.id, { approved: true })).rejects.toThrow('locked');
    // The supervisor has observed process exit. Only then reconcile the stale lock.
    for (const lock of await fs.readdir(path.join(directory, 'locks'))) await fs.rmdir(path.join(directory, 'locks', lock));
    expect((await agent.resumeRun(recovered.id, { approved: true })).status).toBe('running');
    expect(action).not.toHaveBeenCalled();
    const effects = await fs.readFile(path.join(directory, 'action.txt'), 'utf8').catch(error => {
      if (error.code === 'ENOENT') return ''; throw error;
    });
    expect(effects).toBe(phase === 'after' ? 'performed\n' : '');
  } finally {
    child.kill('SIGKILL');
    await fs.rm(directory, { recursive: true, force: true });
  }
}, 15000);
