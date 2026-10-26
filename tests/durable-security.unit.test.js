const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { FileRunStore, InMemoryRunStore, FileJobStore, FileLayerStore, InMemoryLayerStore, Memory, Run } = require('..');

let directory;
beforeEach(async () => { directory = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-durability-')); });
afterEach(async () => { await fs.rm(directory, { recursive: true, force: true }); });

test('run IDs cannot traverse the store directory', async () => {
  const store = new FileRunStore({ directory });
  for (const id of ['../outside', '/absolute', 'sub/file', 'sub\\file', '\0']) {
    await expect(store.getRun(id)).rejects.toThrow('Invalid run ID');
    await expect(store.saveRun(new Run({ id }))).rejects.toThrow('Invalid run ID');
  }
  expect(await fs.readdir(directory)).toEqual([]);
});

test('job IDs cannot traverse the store directory', async () => {
  const store = new FileJobStore({ directory });
  await expect(store.getJob('../outside')).rejects.toThrow('Invalid record ID');
  await expect(store.saveJob({ id: '../outside' })).rejects.toThrow('Invalid record ID');
  await store.saveJob({ id: 'job', status: 'pending' });
  expect((await store.getJob('job')).status).toBe('pending');
});

test('prototype-like memory keys remain ordinary own records', async () => {
  for (const store of [new InMemoryLayerStore(), new FileLayerStore({ filePath: path.join(directory, 'memory.json') })]) {
    expect(await store.get('constructor')).toBeNull();
    await store.set('__proto__', { value: 'safe' });
    expect((await store.get('__proto__')).value).toBe('safe');
    expect((await store.entries()).map(([key]) => key)).toContain('__proto__');
    const memory = new Memory({ stores: { working: store } });
    await memory.setWorkingMemory('__proto__', 'ordinary value');
    expect(memory.getWorkingMemory('__proto__')).toBe('ordinary value');
    expect(memory.getWorkingMemory('constructor')).toBeNull();
  }
});

test('atomic replacement leaves a valid record and private file permissions', async () => {
  const store = new FileRunStore({ directory });
  await store.saveRun(new Run({ id: 'test', output: 'first' }));
  await store.saveRun(new Run({ id: 'test', output: 'second' }));
  expect((await store.getRun('test')).output).toBe('second');
  expect(await fs.readdir(directory)).toEqual(['test.json']);
  if (process.platform !== 'win32') expect((await fs.stat(path.join(directory, 'test.json'))).mode & 0o777).toBe(0o600);
});

test('in-memory runs are snapshots rather than mutable references to persisted state', async () => {
  const store = new InMemoryRunStore();
  const original = new Run({ id: 'snapshot', state: { nested: { value: 'saved' } } });
  await store.saveRun(original);
  original.state.nested.value = 'changed without save';
  const read = await store.getRun(original.id);
  expect(read.state.nested.value).toBe('saved');
  read.state.nested.value = 'changed on read';
  expect((await store.listRuns())[0].state.nested.value).toBe('saved');
});

test('completed persistence survives forced process termination without treating intent as completion', async () => {
  const source = `
    const {FileRunStore,Run}=require(process.env.AGENT_TEST_MODULE);
    (async()=>{
      const store=new FileRunStore({directory:process.env.AGENT_TEST_DIRECTORY});
      const run=new Run({id:'interrupted',status:'running',state:{action:{status:'intent_recorded',idempotencyKey:'test-key'}}});
      await store.saveRun(run);
      process.stdout.write('READY');
      setInterval(()=>{},1000);
    })().catch(()=>process.exit(1));
  `;
  const child = spawn(process.execPath, ['-e', source], { env: {
    AGENT_TEST_MODULE: path.resolve(__dirname, '..'), AGENT_TEST_DIRECTORY: directory,
  }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Child startup timed out')), 10000);
      child.stdout.once('data', data => { clearTimeout(timer); data.toString().includes('READY') ? resolve() : reject(Error('Unexpected output')); });
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); if (code !== null) reject(Error('Child exited before checkpoint')); });
    });
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill('SIGKILL');
    await exited;
    const recovered = await new FileRunStore({ directory }).getRun('interrupted');
    expect(recovered.status).toBe('running');
    expect(recovered.state.action.status).toBe('intent_recorded');
    expect(recovered.output).toBeNull();
  } finally {
    child.kill('SIGKILL');
  }
}, 15000);

test('symlinked run files are not followed where O_NOFOLLOW is supported', async () => {
  if (process.platform === 'win32') return;
  await fs.writeFile(path.join(directory, 'private-data'), 'private');
  await fs.symlink(path.join(directory, 'private-data'), path.join(directory, 'linked.json'));
  await expect(new FileRunStore({ directory }).getRun('linked')).rejects.toThrow();
});
