// src/agent/Memory.js
const { EventEmitter } = require('events');

class Memory extends EventEmitter {
  constructor({ vectorStore = null, adapter = null } = {}) {
    super();
    this.conversation = [];
    this.entities = {};
    this.vectorStore = vectorStore;
    this.adapter = adapter;
  }

  /** ----------------------
   * Embedding Helper
   ------------------------ */
  async _getEmbedding(text) {
    if (!this.adapter?.embedChunks) {
      throw new Error('Adapter does not support embedChunks');
    }
    const result = await this.adapter.embedChunks([text]);
    return result[0]?.embedding;
  }

  /** ----------------------
   * Conversation Memory
   ------------------------ */
  storeConversation(userMessage, agentResponse) {
    this.conversation.push({ user: userMessage, agent: agentResponse });
    this.emit('conversationUpdate', { user: userMessage, agent: agentResponse });
  }

  getContext() {
    return this.conversation
      .map(turn => `User: ${turn.user}\nAgent: ${turn.agent}`)
      .join('\n');
  }

  /** ----------------------
   * Entity Memory (Key-Value)
   ------------------------ */
  setEntity(key, value, ttlMs = null) {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    const k = key.toLowerCase();
    this.entities[k] = { value, expiresAt };

    this.emit('memoryUpdate', { type: 'entity', key, value, expiresAt });

    console.log(`[EntityMemory] Stored "${key}" → "${value}" (TTL: ${ttlMs ? ttlMs / 1000 + 's' : 'Forever'})`);
  }

  getEntity(key) {
    const k = key.toLowerCase();
    const item = this.entities[k];
    if (!item) return null;

    const now = Date.now();
    if (item.expiresAt && item.expiresAt < now) {
      console.log(`[EntityMemory] "${key}" has expired. Removing.`);
      delete this.entities[k];
      this.emit('memoryExpire', { type: 'entity', key });
      return null;
    }

    return item.value;
  }

  /** ----------------------
   * Semantic Memory (Vector DB)
   ------------------------ */
  async storeSemanticMemory(fact, metadata = {}) {
    if (!this.vectorStore) return;

    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const embedding = await this._getEmbedding(fact);

    await this.vectorStore.upsert({
      vectors: [
        {
          id,
          values: embedding,
          metadata: {
            fact,
            ...metadata
          }
        }
      ]
    });

    this.emit('memoryUpdate', { type: 'semantic', fact, id });

    console.log(`[SemanticMemory] Stored fact: "${fact}"`);
  }

  async searchSemanticMemory(query, topK = 3) {
    if (!this.vectorStore) return null;

    const embedding = await this._getEmbedding(query);

    const { matches } = await this.vectorStore.query({
      vector: embedding,
      topK,
    });

    if (!matches?.length) {
      console.log(`[SemanticMemory] No matches found for "${query}".`);
      return null;
    }

    const topMatch = matches[0];
    const { metadata, score } = topMatch;

    console.log(`[SemanticMemory] Top match for "${query}" (score ${score}):`, metadata);

    return metadata?.fact || null;
  }

  async searchAll(query, topK = 3) {
    if (!this.vectorStore) return [];

    const embedding = await this._getEmbedding(query);

    const { matches } = await this.vectorStore.query({
      vector: embedding,
      topK,
    });

    if (!matches?.length) {
      console.log(`[SemanticMemory] No matches found for "${query}".`);
      return [];
    }

    return matches.map(match => ({
      fact: match.metadata?.fact,
      score: match.score,
    }));
  }

  /** ----------------------
   * Unified Getter (Entity → Semantic → null)
   ------------------------ */
  async get(key) {
    const fromEntity = this.getEntity(key);
    if (fromEntity) return fromEntity;

    const fromSemantic = await this.searchSemanticMemory(key);
    if (fromSemantic) return fromSemantic;

    return null;
  }

  /** ----------------------
   * Unified Setter
   ------------------------ */
  async set(key, value, { ttlMs = null, persist = false } = {}) {
    this.setEntity(key, value, ttlMs);

    if (persist && this.vectorStore) {
      const fact = `${key} is ${value}`;
      await this.storeSemanticMemory(fact);
    }
  }

  /** ----------------------
   * Clear functions
   ------------------------ */
  clearConversation() {
    this.conversation = [];
    this.emit('memoryClear', { type: 'conversation' });
  }

  clearEntities() {
    this.entities = {};
    this.emit('memoryClear', { type: 'entity' });
  }

  async clearSemanticMemory() {
    await this.vectorStore?.deleteAll();
    this.emit('memoryClear', { type: 'semantic' });
  }

  async clearAll() {
    this.clearConversation();
    this.clearEntities();
    await this.clearSemanticMemory();
    this.emit('memoryClear', { type: 'all' });
  }
}

module.exports = { Memory };