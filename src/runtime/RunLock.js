const fs = require('fs/promises');
const path = require('path');
const { createHash } = require('crypto');
const { ToolPolicyError } = require('../errors');

class InMemoryRunLock {
  constructor() { this.active = new Set(); }

  async withLock(key, action) {
    if (typeof key !== 'string' || typeof action !== 'function') throw new TypeError('Invalid run lock request.');
    if (this.active.has(key)) throw new ToolPolicyError('Run is already executing.');
    this.active.add(key);
    try { return await action(); }
    finally { this.active.delete(key); }
  }
}

/** Exclusive shared-filesystem lock. Never steals a lock from a potentially live worker. */
class FileRunLock {
  constructor({ directory } = {}) {
    if (typeof directory !== 'string' || !directory) throw new TypeError('Lock directory is required.');
    this.directory = directory;
  }

  async withLock(key, action) {
    if (typeof key !== 'string' || typeof action !== 'function') throw new TypeError('Invalid run lock request.');
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    const lockPath = path.join(this.directory, createHash('sha256').update(key).digest('hex'));
    try { await fs.mkdir(lockPath, { mode: 0o700 }); }
    catch (error) {
      if (error.code === 'EEXIST') throw new ToolPolicyError('Run is locked; reconcile a crashed owner before recovery.');
      throw error;
    }
    try { return await action(); }
    finally { await fs.rmdir(lockPath); }
  }
}

const defaultRunLock = new InMemoryRunLock();
module.exports = { InMemoryRunLock, FileRunLock, defaultRunLock };
