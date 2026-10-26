const fs = require('fs/promises');
const { constants } = require('fs');
const path = require('path');
const { LocalVectorStore } = require('./LocalVectorStore');
const { FileRunLock } = require('../runtime/RunLock');
const { SchemaSafety } = require('../runtime/SchemaSafety');
const { writeJson } = require('../runtime/stores/PrivateJsonFile');
const { ToolExecutionError } = require('../errors');
const contract = require('./VectorContract');
const MISSING = Symbol('missing snapshot');

/** Bounded snapshot storage for small local workloads, not a distributed index. */
class FileVectorStore {
  constructor({ filePath, runLock = null, maxFileBytes = 16777216, maxEntries = 10000 } = {}) {
    if (typeof filePath !== 'string' || !filePath || filePath.includes('\0') ||
        !Number.isSafeInteger(maxFileBytes) || maxFileBytes < 256 || maxFileBytes > 67108864 ||
        !Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 100000 ||
        (runLock && typeof runLock.withLock !== 'function')) throw new TypeError('Invalid file vector configuration.');
    this.filePath = path.resolve(filePath);
    this.maxFileBytes = maxFileBytes;
    this.maxEntries = maxEntries;
    this.runLock = runLock || new FileRunLock({ directory: `${this.filePath}.locks` });
    this.lockKey = JSON.stringify(['file-vectors', this.filePath]);
    this.safety = new SchemaSafety({ maxBytes: maxFileBytes, maxNodes: 1000000 });
    this.capabilities = { namespaceIsolation: true, persistence: true };
  }

  async _readSnapshot() {
    let handle;
    try {
      handle = await fs.open(this.filePath, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > this.maxFileBytes) throw new Error('Invalid snapshot file.');
      const chunks = [];
      let size = 0;
      while (true) {
        const buffer = Buffer.alloc(Math.min(65536, this.maxFileBytes - size + 1));
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
        if (!bytesRead) break;
        size += bytesRead;
        if (size > this.maxFileBytes) throw new Error('Snapshot size limit.');
        chunks.push(buffer.subarray(0, bytesRead));
      }
      return JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return MISSING;
      throw error;
    } finally { if (handle) await handle.close(); }
  }

  async _load() {
    const snapshot = await this._readSnapshot();
    const store = new LocalVectorStore();
    if (snapshot === MISSING) return store;
    this.safety.assertValue(snapshot);
    if (snapshot?.kind !== 'agnostic-agents/vector-snapshot' || snapshot.version !== '1.0' ||
        !Array.isArray(snapshot.namespaces)) throw new Error('Unsupported vector snapshot.');
    const seen = new Set();
    let entries = 0;
    for (const item of snapshot.namespaces) {
      if (!item || typeof item.namespace !== 'string' || !Array.isArray(item.records) || seen.has(item.namespace)) {
        throw new Error('Invalid vector snapshot namespace.');
      }
      const ns = contract.namespace(item.namespace);
      seen.add(ns);
      if ((entries += item.records.length) > this.maxEntries) throw new Error('Vector capacity limit.');
      if (item.records.length) {
        if (new Set(item.records.map(record => record.id)).size !== item.records.length) throw new Error('Duplicate vector ID.');
        for (let offset = 0; offset < item.records.length; offset += 10000) {
          const records = item.records.slice(offset, offset + 10000);
          contract.records(records);
          await store.upsert({ namespace: ns, vectors: records });
        }
      }
    }
    return store;
  }

  async _save(store) {
    const namespaces = [];
    let entries = 0;
    for (const [namespace, records] of store.namespaces) {
      if (!records.size) continue;
      for (const [id, record] of records) contract.records([{ id, ...record }]);
      entries += records.size;
      namespaces.push({ namespace, records: [...records].map(([id, record]) => ({ id, ...record })) });
    }
    if (entries > this.maxEntries) throw new Error('Vector capacity limit.');
    const snapshot = { kind: 'agnostic-agents/vector-snapshot', version: '1.0', namespaces };
    this.safety.assertValue(snapshot);
    if (Buffer.byteLength(JSON.stringify(snapshot, null, 2)) > this.maxFileBytes) throw new Error('Vector snapshot size limit.');
    await writeJson(this.filePath, snapshot);
  }

  async _withStore(action, write = false) {
    return this.runLock.withLock(this.lockKey, async () => {
      let saving = false;
      try {
        const store = await this._load();
        const result = await action(store);
        if (write) { saving = true; await this._save(store); }
        return result;
      } catch {
        const error = new ToolExecutionError('Local vector storage operation failed; reconcile the snapshot before retrying.');
        error.retryable = false;
        error.uncertain = saving;
        throw error;
      }
    });
  }

  async upsert({ vectors, namespace = '' }) {
    const ns = contract.namespace(namespace); contract.records(vectors);
    const captured = vectors.map(record => ({ id: record.id, values: [...record.values],
      metadata: contract.metadata(record.metadata) }));
    return this._withStore(store => store.upsert({ vectors: captured, namespace: ns }), true);
  }
  async query({ vector, topK = 5, namespace = '', filter = {} }) {
    contract.vector(vector); contract.limit(topK); contract.filterTree(filter);
    const ns = contract.namespace(namespace);
    const capturedVector = [...vector], capturedFilter = JSON.parse(JSON.stringify(filter));
    return this._withStore(store => store.query({ vector: capturedVector, topK, namespace: ns, filter: capturedFilter }));
  }
  async delete({ ids, namespace = '' }) {
    contract.ids(ids); const ns = contract.namespace(namespace);
    const captured = [...ids];
    return this._withStore(store => store.delete({ ids: captured, namespace: ns }), true);
  }
  async deleteAll({ namespace = '' } = {}) {
    const ns = contract.namespace(namespace);
    return this._withStore(store => store.deleteAll({ namespace: ns }), true);
  }
}
module.exports = { FileVectorStore };
