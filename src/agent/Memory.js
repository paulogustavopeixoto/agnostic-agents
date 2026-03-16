const { EventEmitter } = require('events');
const { InMemoryLayerStore } = require('./memory/InMemoryLayerStore');
const { BaseLayerStore } = require('./memory/BaseLayerStore');

class Memory extends EventEmitter {
  constructor({
    vectorStore = null,
    adapter = null,
    stores = {},
    policies = {},
  } = {}) {
    super();
    this.vectorStore = vectorStore;
    this.adapter = adapter;
    const workingStore = stores.working || new InMemoryLayerStore();
    const profileStore = stores.profile || new InMemoryLayerStore();
    const policyStore = stores.policy || new InMemoryLayerStore();
    BaseLayerStore.assert(workingStore, 'Memory working store');
    BaseLayerStore.assert(profileStore, 'Memory profile store');
    BaseLayerStore.assert(policyStore, 'Memory policy store');
    this.stores = {
      working: workingStore,
      profile: profileStore,
      policy: policyStore,
    };
    this.policies = {
      conversationLimit: policies.conversationLimit || null,
      workingLimit: policies.workingLimit || null,
      profileLimit: policies.profileLimit || null,
      policyLimit: policies.policyLimit || null,
    };

    this.layers = {
      conversation: [],
      working: {},
      profile: {},
      policy: {},
    };

    // Backward-compatible aliases.
    this.conversation = this.layers.conversation;
    this.entities = this.layers.profile;
  }

  _createRecord(value, ttlMs = null, metadata = {}) {
    const now = Date.now();
    return {
      value,
      createdAt: now,
      updatedAt: now,
      expiresAt: ttlMs ? now + ttlMs : null,
      metadata: { ...metadata },
    };
  }

  async _setLayerValue(layerName, key, value, ttlMs = null, metadata = {}) {
    const normalizedKey = key.toLowerCase();
    const record = this._createRecord(value, ttlMs, metadata);
    this.layers[layerName][normalizedKey] = record;
    if (this.stores[layerName]) {
      await this.stores[layerName].set(normalizedKey, record);
    }
    this.emit('memoryUpdate', {
      type: layerName,
      key,
      value,
      expiresAt: record.expiresAt,
      metadata,
    });
  }

  _getLayerValue(layerName, key) {
    const normalizedKey = key.toLowerCase();
    const record = this.layers[layerName][normalizedKey];

    if (!record) {
      return null;
    }

    if (record.expiresAt && record.expiresAt < Date.now()) {
      delete this.layers[layerName][normalizedKey];
      if (this.stores[layerName]) {
        void this.stores[layerName].delete(normalizedKey);
      }
      this.emit('memoryExpire', { type: layerName, key });
      return null;
    }

    return record.value;
  }

  _listLayer(layerName) {
    const entries = [];

    for (const [key, record] of Object.entries(this.layers[layerName])) {
      const value = this._getLayerValue(layerName, key);
      if (value !== null) {
        entries.push({
          key,
          value,
          metadata: record.metadata,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          expiresAt: record.expiresAt,
        });
      }
    }

    return entries;
  }

  async hydrate() {
    for (const layerName of ['working', 'profile', 'policy']) {
      if (!this.stores[layerName]?.entries) {
        continue;
      }

      const entries = await this.stores[layerName].entries();
      this.layers[layerName] = Object.fromEntries(entries);
    }

    this.entities = this.layers.profile;
    return this;
  }

  _compactKeyValueLayer(layerName, limit = null) {
    if (!limit || limit <= 0) {
      return;
    }

    const entries = Object.entries(this.layers[layerName]);
    if (entries.length <= limit) {
      return;
    }

    entries
      .sort((a, b) => a[1].updatedAt - b[1].updatedAt)
      .slice(0, entries.length - limit)
      .forEach(([key]) => {
        delete this.layers[layerName][key];
        if (this.stores[layerName]) {
          void this.stores[layerName].delete(key);
        }
      });
  }

  compact() {
    if (this.policies.conversationLimit && this.layers.conversation.length > this.policies.conversationLimit) {
      this.layers.conversation = this.layers.conversation.slice(-this.policies.conversationLimit);
      this.conversation = this.layers.conversation;
    }

    this._compactKeyValueLayer('working', this.policies.workingLimit);
    this._compactKeyValueLayer('profile', this.policies.profileLimit);
    this._compactKeyValueLayer('policy', this.policies.policyLimit);
    this.emit('memoryCompaction', { policies: this.policies });
  }

  decayExpired() {
    for (const layerName of ['working', 'profile', 'policy']) {
      for (const key of Object.keys(this.layers[layerName])) {
        this._getLayerValue(layerName, key);
      }
    }
  }

  async _getEmbedding(text) {
    if (!this.adapter?.embedChunks) {
      throw new Error('Adapter does not support embedChunks');
    }

    const result = await this.adapter.embedChunks([text]);
    return result[0]?.embedding;
  }

  storeConversation(userMessage, agentResponse, metadata = {}) {
    const turn = {
      user: userMessage,
      agent: agentResponse,
      createdAt: Date.now(),
      metadata: { ...metadata },
    };

    this.layers.conversation.push(turn);
    this.compact();
    this.emit('conversationUpdate', turn);
  }

  getConversation() {
    return [...this.layers.conversation];
  }

  getContext() {
    return this.layers.conversation
      .map(turn => `User: ${turn.user}\nAgent: ${turn.agent}`)
      .join('\n');
  }

  async setWorkingMemory(key, value, { ttlMs = null, metadata = {} } = {}) {
    await this._setLayerValue('working', key, value, ttlMs, metadata);
    this._compactKeyValueLayer('working', this.policies.workingLimit);
  }

  getWorkingMemory(key) {
    return this._getLayerValue('working', key);
  }

  listWorkingMemory() {
    return this._listLayer('working');
  }

  clearWorkingMemory() {
    this.layers.working = {};
    if (this.stores.working) {
      void this.stores.working.clear();
    }
    this.emit('memoryClear', { type: 'working' });
  }

  async setProfile(key, value, { ttlMs = null, metadata = {} } = {}) {
    await this._setLayerValue('profile', key, value, ttlMs, metadata);
    this._compactKeyValueLayer('profile', this.policies.profileLimit);
  }

  getProfile(key) {
    return this._getLayerValue('profile', key);
  }

  listProfile() {
    return this._listLayer('profile');
  }

  clearProfile() {
    this.layers.profile = {};
    this.entities = this.layers.profile;
    if (this.stores.profile) {
      void this.stores.profile.clear();
    }
    this.emit('memoryClear', { type: 'profile' });
  }

  // Backward-compatible entity aliases.
  setEntity(key, value, ttlMs = null) {
    void this.setProfile(key, value, { ttlMs });
  }

  getEntity(key) {
    return this.getProfile(key);
  }

  clearEntities() {
    this.clearProfile();
  }

  async setPolicy(key, value, { ttlMs = null, metadata = {} } = {}) {
    await this._setLayerValue('policy', key, value, ttlMs, metadata);
    this._compactKeyValueLayer('policy', this.policies.policyLimit);
  }

  getPolicy(key) {
    return this._getLayerValue('policy', key);
  }

  listPolicies() {
    return this._listLayer('policy');
  }

  clearPolicies() {
    this.layers.policy = {};
    if (this.stores.policy) {
      void this.stores.policy.clear();
    }
    this.emit('memoryClear', { type: 'policy' });
  }

  async storeSemanticMemory(fact, metadata = {}) {
    if (!this.vectorStore) {
      return;
    }

    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const embedding = await this._getEmbedding(fact);

    await this.vectorStore.upsert({
      vectors: [
        {
          id,
          values: embedding,
          metadata: {
            fact,
            text: metadata.text || fact,
            ...metadata,
          },
        },
      ],
    });

    this.emit('memoryUpdate', { type: 'semantic', fact, id, metadata });
  }

  async searchSemanticMemory(query, topK = 3) {
    const results = await this.searchSemanticMemoryWithProvenance(query, topK);
    return results[0]?.fact || null;
  }

  async searchSemanticMemoryWithProvenance(query, topK = 3) {
    if (!this.vectorStore) {
      return [];
    }

    const embedding = await this._getEmbedding(query);
    const { matches } = await this.vectorStore.query({
      vector: embedding,
      topK,
    });

    if (!matches?.length) {
      return [];
    }

    return matches.map(match => ({
      id: match.id || null,
      fact: match.metadata?.fact || match.metadata?.text || null,
      score: match.score,
      normalizedScore:
        typeof match.score === 'number'
          ? Math.max(0, Math.min(1, Number(match.score.toFixed(4))))
          : null,
      metadata: match.metadata || {},
    }));
  }

  async searchAll(query, topK = 3) {
    const results = await this.searchSemanticMemoryWithProvenance(query, topK);
    return results.map(result => ({
      fact: result.fact,
      score: result.score,
    }));
  }

  async get(key) {
    const fromProfile = this.getProfile(key);
    if (fromProfile) return fromProfile;

    const fromWorking = this.getWorkingMemory(key);
    if (fromWorking) return fromWorking;

    const fromPolicy = this.getPolicy(key);
    if (fromPolicy) return fromPolicy;

    const fromSemantic = await this.searchSemanticMemory(key);
    if (fromSemantic) return fromSemantic;

    return null;
  }

  async set(key, value, { ttlMs = null, persist = false, layer = 'profile', metadata = {} } = {}) {
    if (layer === 'working') {
      await this.setWorkingMemory(key, value, { ttlMs, metadata });
    } else if (layer === 'policy') {
      await this.setPolicy(key, value, { ttlMs, metadata });
    } else {
      await this.setProfile(key, value, { ttlMs, metadata });
    }

    if (persist && this.vectorStore) {
      const fact = `${key} is ${value}`;
      await this.storeSemanticMemory(fact, { layer, ...metadata });
    }
  }

  clearConversation() {
    this.layers.conversation = [];
    this.conversation = this.layers.conversation;
    this.emit('memoryClear', { type: 'conversation' });
  }

  async clearSemanticMemory() {
    await this.vectorStore?.deleteAll();
    this.emit('memoryClear', { type: 'semantic' });
  }

  async clearAll() {
    this.clearConversation();
    this.clearWorkingMemory();
    this.clearProfile();
    this.clearPolicies();
    await this.clearSemanticMemory();
    this.emit('memoryClear', { type: 'all' });
  }
}

module.exports = { Memory };
