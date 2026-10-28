const { createHash } = require('crypto');
const { ArtifactResolver } = require('..');
const digest = value => createHash('sha256').update(value).digest('hex');
const metadata = () => ({ tenantId: 'tenant', sizeBytes: 4, mimeType: 'text/plain', version: 'v1', sha256: digest('safe') });
const resolver = (store, options = {}) => new ArtifactResolver({ store, tenantId: 'tenant', authorize: async () => true, ...options });

test('matching digest and version return verified bytes with pinned storage reads', async () => {
  const read = jest.fn(async function* () { yield Buffer.from('sa'); yield Buffer.from('fe'); });
  const result = await resolver({ stat: async () => metadata(), read }, { requireVersion: true, requireIntegrity: true }).read('asset');
  expect(result.data.toString()).toBe('safe'); expect(result.sha256).toBe(digest('safe'));
  expect(result.version).toBe('v1');
  expect(read.mock.calls[0][1]).toMatchObject({ tenantId: 'tenant', version: 'v1', signal: expect.any(AbortSignal) });
});

test('same-size substituted content fails integrity even without strict integrity mode', async () => {
  let closed = false;
  const store = { stat: async () => metadata(), read: async function* () { try { yield Buffer.from('evil'); } finally { closed = true; } } };
  await expect(resolver(store).read('asset')).rejects.toThrow(/integrity/i);
  expect(closed).toBe(true);
});

test.each([undefined, '', 'not-a-digest', 'a'.repeat(63)])('strict integrity rejects missing/invalid digest before reading (%s)', async sha256 => {
  const store = { stat: async () => ({ ...metadata(), sha256 }), read: jest.fn() };
  await expect(resolver(store, { requireIntegrity: true }).read('asset')).rejects.toThrow(/integrity/i);
  expect(store.read).not.toHaveBeenCalled();
});

test('metadata is captured before a backend can mutate declared size and digest', async () => {
  const mutable = metadata();
  const store = { stat: async () => mutable, read: async function* () {
    mutable.sizeBytes = 8; mutable.sha256 = digest('unsafe!!');
    yield Buffer.from('unsafe!!');
  } };
  await expect(resolver(store).read('asset')).rejects.toThrow(/size/i);
});

test.each(['authorize', 'stat', 'read', 'next'])('whole-read deadline includes a stalled %s stage', async stage => {
  const never = () => new Promise(() => {});
  const read = jest.fn(() => stage === 'read' ? never() : { [Symbol.asyncIterator]: () => ({ next: never, return: async () => ({ done: true }) }) });
  const stat = jest.fn(stage === 'stat' ? never : async () => metadata());
  const authorize = jest.fn(stage === 'authorize' ? never : async () => true);
  await expect(resolver({ stat, read }, { authorize, timeoutMs: 15 }).read('asset')).rejects.toThrow(/deadline/i);
  if (stage === 'authorize') expect(stat).not.toHaveBeenCalled();
  if (['authorize', 'stat'].includes(stage)) expect(read).not.toHaveBeenCalled();
});

test('zero-byte chunk floods terminate and close the upstream iterator', async () => {
  let closed = false;
  const store = { stat: async () => ({ tenantId: 'tenant', sizeBytes: 0 }), read: async function* () {
    try { for (let i = 0; i < 10; i++) yield Buffer.alloc(0); } finally { closed = true; }
  } };
  await expect(resolver(store, { maxChunks: 3 }).read('asset')).rejects.toThrow(/chunk/i);
  expect(closed).toBe(true);
});

test('caller cancellation interrupts a pending read and closes cooperative storage', async () => {
  let start; const started = new Promise(resolve => { start = resolve; });
  const controller = new AbortController(); let storageSignal;
  const close = jest.fn(async () => ({ done: true }));
  const store = { stat: async () => metadata(), read: (_, options) => {
    storageSignal = options.signal;
    return { [Symbol.asyncIterator]: () => ({ next: () => { start(); return new Promise(() => {}); }, return: close }) };
  } };
  const pending = resolver(store).read('asset', { signal: controller.signal });
  await started; controller.abort(new Error('private cancellation reason'));
  await expect(pending).rejects.toThrow(/cancel/i);
  await new Promise(resolve => setImmediate(resolve));
  expect(storageSignal.aborted).toBe(true); expect(close).toHaveBeenCalledTimes(1);
});

test('storage errors are sanitized and explicitly non-retryable', async () => {
  const store = { stat: async () => { throw new Error('Bearer synthetic-private-credential'); }, read: jest.fn() };
  await expect(resolver(store).read('asset')).rejects.toMatchObject({ message: 'Artifact read failed.', retryable: false });
});

test('legacy storage without digest remains usable unless strict integrity is required', async () => {
  const store = { stat: async () => ({ tenantId: 'tenant', sizeBytes: 4 }), read: async function* () { yield Buffer.from('safe'); } };
  expect((await resolver(store).read('asset')).data.toString()).toBe('safe');
});

test('late metadata resolution after a deadline cannot start a content read', async () => {
  let resolve;
  const read = jest.fn();
  const store = { stat: () => new Promise(done => { resolve = done; }), read };
  await expect(resolver(store, { timeoutMs: 15 }).read('asset')).rejects.toThrow(/deadline/i);
  resolve(metadata()); await new Promise(done => setImmediate(done));
  expect(read).not.toHaveBeenCalled();
});

test('zero-byte content can be verified and uppercase digests are normalized', async () => {
  const store = { stat: async () => ({ tenantId: 'tenant', sizeBytes: 0, sha256: digest('').toUpperCase() }), read: async function* () {} };
  const result = await resolver(store, { requireIntegrity: true }).read('asset');
  expect(result.data.length).toBe(0); expect(result.sha256).toBe(digest(''));
});

test.each([{ timeoutMs: 0 }, { maxChunks: 0 }, { requireIntegrity: 'yes' }, { requireVersion: 1 }])('invalid bounds/modes fail at construction (%j)', options => {
  expect(() => resolver({ stat: async () => metadata(), read: async function* () {} }, options)).toThrow('Invalid artifact resolver');
});

test('progressing streams do not reset the whole-read deadline after each chunk', async () => {
  const store = { stat: async () => ({ tenantId: 'tenant', sizeBytes: 100 }), read: async function* () {
    for (let i = 0; i < 100; i++) { await new Promise(resolve => setTimeout(resolve, 5)); yield Buffer.from('x'); }
  } };
  await expect(resolver(store, { timeoutMs: 25 }).read('asset')).rejects.toThrow(/deadline/i);
});

test('non-cooperative iterator cleanup cannot indefinitely delay a rejected read', async () => {
  const close = jest.fn(() => new Promise(() => {}));
  const store = { stat: async () => ({ tenantId: 'tenant', sizeBytes: 1 }), read: () => ({
    [Symbol.asyncIterator]: () => ({ next: async () => ({ value: Buffer.from('too large'), done: false }), return: close }),
  }) };
  await expect(resolver(store, { timeoutMs: 20 }).read('asset')).rejects.toThrow();
  expect(close).toHaveBeenCalledTimes(1);
});
