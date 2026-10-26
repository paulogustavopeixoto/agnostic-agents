const { BaseLayerStore } = require('./BaseLayerStore');
const { readJson, writeJson } = require('../../runtime/stores/PrivateJsonFile');

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
      return await readJson(this.filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {};
      }

      throw error;
    }
  }

  async _write(records) {
    await writeJson(this.filePath, records);
  }

  async get(key) {
    const records = await this._read();
    return Object.hasOwn(records, key) ? records[key] : null;
  }

  async set(key, value) {
    const records = await this._read();
    Object.defineProperty(records, key, { value, enumerable: true, configurable: true, writable: true });
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
