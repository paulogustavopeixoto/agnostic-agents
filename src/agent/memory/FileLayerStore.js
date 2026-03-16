const fs = require('fs/promises');
const path = require('path');
const { BaseLayerStore } = require('./BaseLayerStore');

class FileLayerStore extends BaseLayerStore {
  constructor({ filePath } = {}) {
    super();
    if (!filePath) {
      throw new Error('FileLayerStore requires a filePath.');
    }

    this.filePath = filePath;
  }

  async _read() {
    try {
      const payload = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(payload);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {};
      }

      throw error;
    }
  }

  async _write(records) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(records, null, 2), 'utf8');
  }

  async get(key) {
    const records = await this._read();
    return records[key] || null;
  }

  async set(key, value) {
    const records = await this._read();
    records[key] = value;
    await this._write(records);
    return value;
  }

  async delete(key) {
    const records = await this._read();
    delete records[key];
    await this._write(records);
  }

  async entries() {
    const records = await this._read();
    return Object.entries(records);
  }

  async clear() {
    await this._write({});
  }
}

module.exports = { FileLayerStore };
