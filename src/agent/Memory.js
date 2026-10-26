const { EventEmitter } = require('events');
const { randomUUID } = require('crypto');
const { InMemoryLayerStore } = require('./memory/InMemoryLayerStore');
const { BaseLayerStore } = require('./memory/BaseLayerStore');
const { MemoryProvenanceLedger } = require('../runtime/MemoryProvenanceLedger');
const { MemoryRetentionPolicy } = require('../runtime/MemoryRetentionPolicy');
const { MemoryAccessController } = require('../runtime/MemoryAccessController');
const { MemoryConflictResolver } = require('../runtime/MemoryConflictResolver');

class Memory extends EventEmitter {
  constructor({
    vectorStore = null,
    adapter = null,
    stores = {},
    policies = {},
    governance = {},
    conversationStore = null,
    episodicMemory = null,
  } = {}) {
    super();
    this.vectorStore = vectorStore;
    this.conversationStore = conversationStore ? BaseLayerStore.assert(conversationStore, 'Conversation store') : null;
    if (episodicMemory && (typeof episodicMemory.append !== 'function' || typeof episodicMemory.search !== 'function')) {
      throw new TypeError('Invalid episodic memory.');
    }
    this.episodicMemory = episodicMemory;
    this.adapter = adapter;
    this.pendingStorage = new Set();
    this.storageFailures = [];
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
    this.governance = {
      provenanceLedger:
        governance.provenanceLedger instanceof MemoryProvenanceLedger
          ? governance.provenanceLedger
          : new MemoryProvenanceLedger(governance.provenanceLedger || {}),
      retentionPolicy:
        governance.retentionPolicy instanceof MemoryRetentionPolicy
          ? governance.retentionPolicy
          : new MemoryRetentionPolicy(governance.retentionPolicy || {}),
      accessController:
        governance.accessController instanceof MemoryAccessController
          ? governance.accessController
          : new MemoryAccessController(governance.accessController || {}),
      conflictResolver:
        governance.conflictResolver instanceof MemoryConflictResolver
          ? governance.conflictResolver
          : new MemoryConflictResolver(governance.conflictResolver || {}),
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

  _scheduleDeletion(layerName, key) {
    const pending = Promise.resolve().then(() => this.stores[layerName].delete(key))
      .catch(() => { this.storageFailures.push({ layer: layerName, operation: 'delete' }); })
      .finally(() => this.pendingStorage.delete(pending));
    this.pendingStorage.add(pending);
  }

  async flushStorage() {
    while (this.pendingStorage.size) await Promise.all([...this.pendingStorage]);
    if (this.storageFailures.length) {
      const count = this.storageFailures.length;
      this.storageFailures = [];
      throw new Error(`Memory storage deletion failed (${count} operations); reconcile the backing store.`);
    }
  }

  async _setLayerValue(layerName, key, value, ttlMs = null, metadata = {}, context = {}) {
    // Drain older evictions before a key can be reused by a newer write.
    if (this.pendingStorage.size || this.storageFailures.length) await this.flushStorage();
    const normalizedKey = key.toLowerCase();
    const writeDecision = this.governance.accessController.canWrite({
      layer: layerName,
      key: normalizedKey,
      metadata,
      context,
    });

    if (!writeDecision.allowed) {
      this.governance.provenanceLedger.record({
        type: 'write_blocked',
        layer: layerName,
        key: normalizedKey,
        outcome: 'blocked',
        actor: context.actor || null,
        trustZone: context.trustZone || null,
        metadata: { reason: writeDecision.reason, attemptedMetadata: metadata },
      });
      return null;
    }

    const record = this._createRecord(value, ttlMs, metadata);
    const existing = Object.hasOwn(this.layers[layerName], normalizedKey) ? this.layers[layerName][normalizedKey] : null;
    const conflict = this.governance.conflictResolver.detect(existing, record);
    const resolution = this.governance.conflictResolver.resolve(existing, record);

    if (conflict.conflict) {
      this.governance.provenanceLedger.record({
        type: 'conflict_detected',
        layer: layerName,
        key: normalizedKey,
        outcome: resolution.action,
        actor: context.actor || null,
        trustZone: context.trustZone || null,
        metadata: {
          reason: resolution.reason,
          existingValue: existing?.value,
          incomingValue: record.value,
        },
      });
    }

    Object.defineProperty(this.layers[layerName], normalizedKey, {
      value: resolution.record, enumerable: true, configurable: true, writable: true,
    });
    try {
      if (this.stores[layerName]) await this.stores[layerName].set(normalizedKey, resolution.record);
    } catch (error) {
      if (this.layers[layerName][normalizedKey] === resolution.record) {
        if (existing) this.layers[layerName][normalizedKey] = existing;
        else delete this.layers[layerName][normalizedKey];
      }
      throw error;
    }
    this.governance.provenanceLedger.record({
      type: 'write',
      layer: layerName,
      key: normalizedKey,
      outcome: resolution.action === 'reject' ? 'rejected' : 'stored',
      actor: context.actor || null,
      trustZone: context.trustZone || null,
      metadata,
    });
    this.emit('memoryUpdate', {
      type: layerName,
      key,
      value,
      expiresAt: resolution.record?.expiresAt || null,
      metadata,
    });
    return resolution.record;
  }

  _getLayerValue(layerName, key, context = {}) {
    const normalizedKey = key.toLowerCase();
    const record = Object.hasOwn(this.layers[layerName], normalizedKey) ? this.layers[layerName][normalizedKey] : null;

    if (!record) {
      return null;
    }

    if (record.expiresAt && record.expiresAt < Date.now()) {
      delete this.layers[layerName][normalizedKey];
      if (this.stores[layerName]) {
        this._scheduleDeletion(layerName, normalizedKey);
      }
      this.governance.provenanceLedger.record({
        type: 'expire',
        layer: layerName,
        key: normalizedKey,
        outcome: 'expired',
      });
      this.emit('memoryExpire', { type: layerName, key });
      return null;
    }
    const readDecision = this.governance.accessController.canRead({
      layer: layerName,
      key: normalizedKey,
      metadata: record.metadata,
      context,
    });
    if (!readDecision.allowed) {
      this.governance.provenanceLedger.record({
        type: 'read_blocked',
        layer: layerName,
        key: normalizedKey,
        outcome: 'blocked',
        actor: context.actor || null,
        trustZone: context.trustZone || null,
        metadata: { reason: readDecision.reason },
      });
      return null;
    }

    this.governance.provenanceLedger.record({
      type: 'read',
      layer: layerName,
      key: normalizedKey,
      outcome: 'returned',
      actor: context.actor || null,
      trustZone: context.trustZone || null,
      metadata: record.metadata,
    });

    return this.governance.accessController.redact(record, context).value;
  }

  _listLayer(layerName, context = {}) {
    const entries = [];

    for (const [key, record] of Object.entries(this.layers[layerName])) {
      const value = this._getLayerValue(layerName, key, context);
      if (value !== null) {
        const visibleRecord = this.governance.accessController.redact(record, context);
        entries.push({
          key,
          value,
          metadata: visibleRecord.metadata,
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
    if (this.conversationStore) {
      this.layers.conversation = await this.getConversationHistory();
      if (this.policies.conversationLimit) {
        this.layers.conversation = this.layers.conversation.slice(-this.policies.conversationLimit);
      }
      this.conversation = this.layers.conversation;
    }
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
          this._scheduleDeletion(layerName, key);
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

  async storeConversation(userMessage, agentResponse, metadata = {}) {
    const turn = {
      id: randomUUID(),
      user: userMessage,
      agent: agentResponse,
      createdAt: Date.now(),
      metadata: { ...metadata },
    };

    this.layers.conversation.push(turn);
    this.compact();
    this.emit('conversationUpdate', turn);
    if (this.conversationStore) await this.conversationStore.set(turn.id, turn);
    if (this.episodicMemory) await this.episodicMemory.append({ content: { user: userMessage, agent: agentResponse },
      runId: metadata.runId || null, tags: ['conversation'] });
  }

  async searchEpisodicMemory(query, options = {}) {
    return this.episodicMemory ? this.episodicMemory.search({ ...options, query }) : [];
  }

  async getConversationHistory() {
    if (!this.conversationStore) return this.getConversation();
    return (await this.conversationStore.entries()).map(([, turn]) => turn)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async deleteConversationHistoryBefore(timestamp) {
    if (!Number.isFinite(timestamp)) throw new TypeError('Retention timestamp is required.');
    if (this.conversationStore) {
      for (const [key, turn] of await this.conversationStore.entries()) {
        if (turn.createdAt < timestamp) await this.conversationStore.delete(key);
      }
    }
    this.layers.conversation = this.layers.conversation.filter(turn => turn.createdAt >= timestamp);
    this.conversation = this.layers.conversation;
  }

  getConversation() {
    return [...this.layers.conversation];
  }

  getContext() {
    return this.layers.conversation
      .map(turn => `User: ${turn.user}\nAgent: ${turn.agent}`)
      .join('\n');
  }

  async setWorkingMemory(key, value, { ttlMs = null, metadata = {}, context = {} } = {}) {
    await this._setLayerValue('working', key, value, ttlMs, metadata, context);
    this._compactKeyValueLayer('working', this.policies.workingLimit);
    await this.flushStorage();
  }

  getWorkingMemory(key, context = {}) {
    return this._getLayerValue('working', key, context);
  }

  listWorkingMemory(context = {}) {
    return this._listLayer('working', context);
  }

  async clearWorkingMemory() {
    this.layers.working = {};
    if (this.stores.working) {
      await this.stores.working.clear();
    }
    this.emit('memoryClear', { type: 'working' });
  }

  async setProfile(key, value, { ttlMs = null, metadata = {}, context = {} } = {}) {
    await this._setLayerValue('profile', key, value, ttlMs, metadata, context);
    this._compactKeyValueLayer('profile', this.policies.profileLimit);
    await this.flushStorage();
  }

  getProfile(key, context = {}) {
    return this._getLayerValue('profile', key, context);
  }

  listProfile(context = {}) {
    return this._listLayer('profile', context);
  }

  async clearProfile() {
    this.layers.profile = {};
    this.entities = this.layers.profile;
    if (this.stores.profile) {
      await this.stores.profile.clear();
    }
    this.emit('memoryClear', { type: 'profile' });
  }

  // Backward-compatible entity aliases.
  setEntity(key, value, ttlMs = null) {
    return this.setProfile(key, value, { ttlMs });
  }

  getEntity(key) {
    return this.getProfile(key);
  }

  clearEntities() {
    return this.clearProfile();
  }

  async setPolicy(key, value, { ttlMs = null, metadata = {}, context = {} } = {}) {
    await this._setLayerValue('policy', key, value, ttlMs, metadata, context);
    this._compactKeyValueLayer('policy', this.policies.policyLimit);
    await this.flushStorage();
  }

  getPolicy(key, context = {}) {
    return this._getLayerValue('policy', key, context);
  }

  listPolicies(context = {}) {
    return this._listLayer('policy', context);
  }

  async clearPolicies() {
    this.layers.policy = {};
    if (this.stores.policy) {
      await this.stores.policy.clear();
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

    this.governance.provenanceLedger.record({
      type: 'semantic_write',
      layer: 'semantic',
      key: id,
      outcome: 'stored',
      metadata,
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

  async get(key, options = {}) {
    const fromProfile = this.getProfile(key, options);
    if (fromProfile) return fromProfile;

    const fromWorking = this.getWorkingMemory(key, options);
    if (fromWorking) return fromWorking;

    const fromPolicy = this.getPolicy(key, options);
    if (fromPolicy) return fromPolicy;

    const fromSemantic = await this.searchSemanticMemory(key);
    if (fromSemantic) return fromSemantic;

    return null;
  }

  async set(key, value, { ttlMs = null, persist = false, layer = 'profile', metadata = {}, context = {} } = {}) {
    if (layer === 'working') {
      await this.setWorkingMemory(key, value, { ttlMs, metadata, context });
    } else if (layer === 'policy') {
      await this.setPolicy(key, value, { ttlMs, metadata, context });
    } else {
      await this.setProfile(key, value, { ttlMs, metadata, context });
    }

    if (persist && this.vectorStore) {
      const fact = `${key} is ${value}`;
      await this.storeSemanticMemory(fact, { layer, ...metadata });
    }
  }

  async clearConversation() {
    this.layers.conversation = [];
    this.conversation = this.layers.conversation;
    this.emit('memoryClear', { type: 'conversation' });
    if (this.conversationStore) await this.conversationStore.clear();
  }

  async clearSemanticMemory() {
    await this.vectorStore?.deleteAll();
    this.emit('memoryClear', { type: 'semantic' });
  }

  async clearAll() {
    await this.clearConversation();
    await this.clearWorkingMemory();
    await this.clearProfile();
    await this.clearPolicies();
    await this.clearSemanticMemory();
    if (this.episodicMemory) {
      if (typeof this.episodicMemory.clear !== 'function') throw new Error('Episodic memory must support clear() for complete deletion.');
      await this.episodicMemory.clear();
    }
    await this.flushStorage();
    this.emit('memoryClear', { type: 'all' });
  }

  enforceRetention() {
    for (const layerName of ['working', 'profile', 'policy']) {
      for (const [key, record] of Object.entries(this.layers[layerName])) {
        const decision = this.governance.retentionPolicy.evaluate(record, layerName);
        if (decision.action !== 'keep') {
          delete this.layers[layerName][key];
          if (this.stores[layerName]) {
            this._scheduleDeletion(layerName, key);
          }
          this.governance.provenanceLedger.record({
            type: 'retention',
            layer: layerName,
            key,
            outcome: decision.action,
            metadata: { reason: decision.reason },
          });
        }
      }
    }
  }

  getMemoryAudit(filters = {}) {
    return this.governance.provenanceLedger.list(filters);
  }

  summarizeMemoryGovernance() {
    return {
      ledger: this.governance.provenanceLedger.summarize(),
      layers: {
        working: Object.keys(this.layers.working).length,
        profile: Object.keys(this.layers.profile).length,
        policy: Object.keys(this.layers.policy).length,
        conversation: this.layers.conversation.length,
      },
    };
  }

  exportGovernedState({ accessContracts = null } = {}) {
    return {
      layers: JSON.parse(JSON.stringify(this.layers)),
      governance: {
        audit: this.getMemoryAudit(),
        summary: this.summarizeMemoryGovernance(),
        accessContracts:
          accessContracts && typeof accessContracts.list === 'function'
            ? accessContracts.list()
            : accessContracts || null,
      },
    };
  }
}

module.exports = { Memory };
