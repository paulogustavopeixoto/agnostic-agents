const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { fork } = require('child_process');
const { once } = require('events');
const { FileVectorStore, ScopedVectorStore, LocalVectorStore } = require('..');
let directory, filePath;
beforeEach(async () => { directory = await fs.mkdtemp(path.join(os.tmpdir(), 'aa-file-vectors-')); filePath = path.join(directory, 'vectors.json'); });
afterEach(async () => { jest.restoreAllMocks(); await fs.rm(directory, { recursive: true, force: true }); });
const vectors = [{ id: 'same', values: [1, 0], metadata: { tag: 'test', text: 'source' } }];

test('file vector storage survives re-instantiation, isolates namespaces and persists scoped deletion', async () => {
  const backend = new FileVectorStore({ filePath });
  const a = new ScopedVectorStore({ store: backend, tenantId: 'a', authorize: async () => true });
  const b = new ScopedVectorStore({ store: backend, tenantId: 'b', authorize: async () => true });
  await a.upsert({ vectors }); await b.upsert({ vectors });
  const restarted = new FileVectorStore({ filePath });
  const result = await restarted.query({ namespace: 'a', vector: [1, 0], filter: { tag: { $eq: 'test' } } });
  expect(result.matches[0]).toMatchObject({ id: 'same', metadata: { tenantId: 'a', text: 'source' } });
  result.matches[0].metadata.text = 'mutated';
  expect((await restarted.query({ namespace: 'a', vector: [1, 0] })).matches[0].metadata.text).toBe('source');
  await a.delete({ ids: ['same'] });
  expect((await restarted.query({ namespace: 'a', vector: [1, 0] })).matches).toEqual([]);
  expect((await restarted.query({ namespace: 'b', vector: [1, 0] })).matches).toHaveLength(1);
  await b.deleteAll();
  expect((await new FileVectorStore({ filePath }).query({ namespace: 'b', vector: [1, 0] })).matches).toEqual([]);
  if (process.platform !== 'win32') expect((await fs.stat(filePath)).mode & 0o777).toBe(0o600);
});

test.each(['{', 'null', '{"kind":"agnostic-agents/vector-snapshot","version":"99","namespaces":[]}'])(
  'corrupt or unknown snapshots fail closed without reset (%s)', async payload => {
    await fs.writeFile(filePath, payload);
    const store = new FileVectorStore({ filePath });
    await expect(store.query({ vector: [1, 0] })).rejects.toThrow('reconcile');
    await expect(store.upsert({ vectors })).rejects.toThrow('reconcile');
    expect(await fs.readFile(filePath, 'utf8')).toBe(payload);
  });

test('dimensions, capacity, size, metadata and filter violations never overwrite the committed snapshot', async () => {
  const store = new FileVectorStore({ filePath, maxEntries: 1, maxFileBytes: 1024 });
  await store.upsert({ vectors });
  const before = await fs.readFile(filePath, 'utf8');
  await expect(store.upsert({ vectors: [{ id: 'second', values: [0, 1] }] })).rejects.toThrow('reconcile');
  await expect(store.upsert({ vectors: [{ id: 'same', values: [1] }] })).rejects.toThrow('reconcile');
  await expect(store.upsert({ vectors: [{ id: 'same', values: [1, 0], metadata: { text: 'x'.repeat(2000) } }] })).rejects.toThrow('reconcile');
  await expect(store.query({ vector: [1, 0], filter: { tag: { $regex: '.*' } } })).rejects.toThrow('Unsupported');
  await expect(store.upsert({ vectors: [{ id: 'same', values: [NaN, 0] }] })).rejects.toThrow('Invalid');
  expect(await fs.readFile(filePath, 'utf8')).toBe(before);
});

test('separate instances exclude a concurrent writer and reload after the lock is released', async () => {
  const a = new FileVectorStore({ filePath });
  const b = new FileVectorStore({ filePath });
  let release, entered;
  const ready = new Promise(resolve => { entered = resolve; });
  const first = a._withStore(async () => { entered(); await new Promise(resolve => { release = resolve; }); });
  await ready;
  await expect(b.upsert({ vectors })).rejects.toThrow('locked');
  release(); await first;
  await b.upsert({ vectors });
  expect((await a.query({ vector: [1, 0] })).matches).toHaveLength(1);
});

test('disk-full rename failure preserves old data and cleans temporary files', async () => {
  const store = new FileVectorStore({ filePath }); await store.upsert({ vectors });
  const before = await fs.readFile(filePath, 'utf8');
  jest.spyOn(fs, 'rename').mockRejectedValueOnce(Object.assign(new Error('disk full'), { code: 'ENOSPC' }));
  await expect(store.deleteAll()).rejects.toMatchObject({ retryable: false, uncertain: true });
  expect(await fs.readFile(filePath, 'utf8')).toBe(before);
  expect((await fs.readdir(directory)).filter(name => name.startsWith('.record-'))).toEqual([]);
});

test('permission failures do not become an empty store, and oversized files are rejected before reading', async () => {
  const store = new FileVectorStore({ filePath, maxFileBytes: 256 });
  await fs.writeFile(filePath, 'x'.repeat(257));
  await expect(store.query({ vector: [1] })).rejects.toThrow('reconcile');
  const realOpen = fs.open.bind(fs);
  jest.spyOn(fs, 'open').mockImplementation((target, ...args) => target === filePath
    ? Promise.reject(Object.assign(new Error('private path'), { code: 'EACCES' })) : realOpen(target, ...args));
  await expect(store.query({ vector: [1] })).rejects.toThrow('reconcile');
});

test('file symlinks are rejected on systems supporting no-follow reads', async () => {
  if (process.platform === 'win32') return;
  const target = path.join(directory, 'target.json');
  await fs.writeFile(target, '{}'); await fs.symlink(target, filePath);
  await expect(new FileVectorStore({ filePath }).upsert({ vectors })).rejects.toThrow('reconcile');
  expect(await fs.readFile(target, 'utf8')).toBe('{}');
});

test.each(['before', 'temporary', 'after'])('SIGKILL at %s preserves a valid snapshot and requires dead-owner reconciliation', async stage => {
  const store = new FileVectorStore({ filePath });
  await store.upsert({ namespace: 'tenant', vectors: [{ id: 'one', values: [1, 0], metadata: { text: 'original' } }] });
  const child = fork(path.join(__dirname, 'fixtures/vectorCrashWorker.js'), [filePath, stage], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
  try {
    await Promise.race([once(child, 'message'), once(child, 'exit').then(() => { throw new Error('Writer exited before checkpoint.'); })]);
    await expect(store.upsert({ namespace: 'tenant', vectors })).rejects.toThrow('locked');
    const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
    await expect(store.query({ namespace: 'tenant', vector: [1, 0] })).rejects.toThrow('locked');
    const locks = await fs.readdir(`${filePath}.locks`);
    expect(locks).toHaveLength(1);
    await fs.rmdir(path.join(`${filePath}.locks`, locks[0]));
    expect((await store.query({ namespace: 'tenant', vector: [1, 0] })).matches[0].metadata.text).toBe(stage === 'after' ? 'committed' : 'original');
    const temporary = (await fs.readdir(directory)).filter(name => name.startsWith('.record-'));
    expect(temporary).toHaveLength(stage === 'temporary' ? 1 : 0);
  } finally { if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited; } }
}, 10000);

test('cosine scores remain finite for extreme finite input values', async () => {
  for (const store of [new LocalVectorStore(), new FileVectorStore({ filePath })]) {
    await store.upsert({ vectors: [{ id: 'large', values: [1e308, 1e308] }] });
    expect((await store.query({ vector: [1e308, 1e308] })).matches[0].score).toBeCloseTo(1);
  }
});
