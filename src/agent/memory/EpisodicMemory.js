const { randomUUID } = require('crypto');
const { ScopedLayerStore } = require('./ScopedLayerStore');
const { SchemaSafety } = require('../../runtime/SchemaSafety');
const { ToolPolicyError } = require('../../errors');

class EpisodicMemory {
  constructor({ store, tenantId, authorize, maxEntries = 10000 } = {}) {
    if (typeof authorize !== 'function' || !Number.isSafeInteger(maxEntries) || maxEntries < 1) {
      throw new TypeError('Invalid episodic memory configuration.');
    }
    this.store = new ScopedLayerStore({ store, tenantId });
    this.tenantId = tenantId;
    this.authorize = authorize;
    this.maxEntries = maxEntries;
    this.safety = new SchemaSafety();
  }

  async _allow(operation, input = {}) {
    if (await this.authorize({ operation, tenantId: this.tenantId, ...input }) !== true) {
      throw new ToolPolicyError('Episodic memory access denied.');
    }
  }

  async append({ content, runId = null, tags = [], ttlMs = null } = {}) {
    if (content === undefined) throw new TypeError('Episode content is required.');
    this.safety.assertValue(content);
    if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string') ||
        (ttlMs !== null && (!Number.isSafeInteger(ttlMs) || ttlMs < 1))) throw new TypeError('Invalid episode.');
    await this._allow('write', { runId, tags });
    if ((await this.store.entries()).length >= this.maxEntries) throw new ToolPolicyError('Episodic memory capacity exceeded.');
    const episode = { id: randomUUID(), content: JSON.parse(JSON.stringify(content)), runId,
      tags: [...tags], createdAt: Date.now(), expiresAt: ttlMs === null ? null : Date.now() + ttlMs };
    await this.store.set(episode.id, JSON.parse(JSON.stringify(episode)));
    return episode;
  }

  async search({ query = '', runId = null, tags = [], limit = 5 } = {}) {
    if (typeof query !== 'string' || !Number.isSafeInteger(limit) || limit < 1 || limit > 1000 ||
        !Array.isArray(tags) || tags.some(tag => typeof tag !== 'string')) throw new TypeError('Invalid episodic search.');
    await this._allow('read', { runId, tags });
    const entries = await this.store.entries();
    if (entries.length > this.maxEntries) throw new ToolPolicyError('Episodic memory capacity exceeded.');
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return entries.map(([, episode]) => episode).filter(episode =>
      (!episode.expiresAt || episode.expiresAt > Date.now()) && (!runId || episode.runId === runId) &&
      tags.every(tag => episode.tags.includes(tag)) &&
      (!terms.length || terms.some(term => JSON.stringify(episode.content).toLowerCase().includes(term))))
      .sort((a, b) => b.createdAt - a.createdAt).slice(0, limit).map(episode => JSON.parse(JSON.stringify(episode)));
  }

  async forget(id) { await this._allow('delete', { id }); await this.store.delete(id); }

  async clear() { await this._allow('delete_all'); await this.store.clear(); }

  async pruneExpired() {
    await this._allow('retention');
    let deleted = 0;
    for (const [id, episode] of await this.store.entries()) {
      if (episode.expiresAt && episode.expiresAt <= Date.now()) { await this.store.delete(id); deleted++; }
    }
    return { deleted };
  }
}

module.exports = { EpisodicMemory };
