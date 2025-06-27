// src/agent/Memory.js

class Memory {
  constructor({ vectorStore = null, adapter = null } = {}) {
    this.conversation = [];
    this.entities = {}; // { key: { value, expiresAt } }
    this.vectorStore = vectorStore;
    this.adapter = adapter;
  }

  /** Helper to generate embedding from adapter */
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
    this.entities[key.toLowerCase()] = { value, expiresAt };

    console.log(`[EntityMemory] Stored "${key}" → "${value}" (TTL: ${ttlMs ? ttlMs / 1000 + 's' : 'Forever'})`);
  }

  getEntity(key) {
    const item = this.entities[key.toLowerCase()];
    if (!item) return null;

    const now = Date.now();
    if (item.expiresAt && item.expiresAt < now) {
      console.log(`[EntityMemory] "${key}" has expired. Removing.`);
      delete this.entities[key.toLowerCase()];
      return null;
    }

    return item.value;
  }

  /** ----------------------
   * Semantic Memory (Vector DB)
   ------------------------ */
  async storeSemanticMemory(key, value, metadata = {}) {
    if (!this.vectorStore) return;

    const id = `${key}-${Date.now()}`;
    const embedding = await this._getEmbedding(`${key}: ${value}`);

    await this.vectorStore.upsert({
      vectors: [
        {
          id,
          values: embedding,
          metadata: {
            key,
            value,
            ...metadata
          }
        }
      ]
    });

    console.log(`[SemanticMemory] Stored: "${key}" → "${value}"`);
  }

  async searchSemanticMemory(query, topK = 3) {
    if (!this.vectorStore) return null;

    const embedding = await this._getEmbedding(query);

    const { matches } = await this.vectorStore.query({
      vector: embedding,
      topK,
    });

    if (!matches?.length) return null;

    const topMatch = matches[0];
    const { metadata } = topMatch;

    console.log(`[SemanticMemory] Retrieved for "${query}":`, metadata);

    return metadata?.value || null;
  }

  /** ----------------------
   * Unified Getter (Entity → Semantic → null)
   ------------------------ */
  async get(key) {
    const fromEntity = this.getEntity(key);
    if (fromEntity) {
      return fromEntity;
    }

    const fromSemantic = await this.searchSemanticMemory(key);
    if (fromSemantic) {
      return fromSemantic;
    }

    return null; // Signal missing
  }

  /** ----------------------
   * Unified Setter
   ------------------------ */
  async set(key, value, { ttlMs = null, persist = false } = {}) {
    this.setEntity(key, value, ttlMs);

    if (persist && this.vectorStore) {
      await this.storeSemanticMemory(key, value);
    }
  }

  /** ----------------------
   * Clear functions
   ------------------------ */
  clearConversation() {
    this.conversation = [];
  }

  clearEntities() {
    this.entities = {};
  }

  async clearSemanticMemory() {
    await this.vectorStore?.deleteAll();
  }

  async clearAll() {
    this.clearConversation();
    this.clearEntities();
    await this.clearSemanticMemory();
  }
}

module.exports = { Memory };