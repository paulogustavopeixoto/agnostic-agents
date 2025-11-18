// src/rag/RAG.js
const { chunkText } = require('../utils/chunkText');
const { RetryManager } = require('../utils/RetryManager');

class RAG {
  /**
   * Initializes a Retrieval-Augmented Generation handler.
   * @param {object} options
   * @param {object} options.adapter - Adapter for generation/embeddings (e.g., OpenAIAdapter).
   * @param {object} [options.vectorStore] - Vector store for retrieval/indexing (e.g., PineconeManager).
   * @param {string} [options.indexName] - Index name (required for vectorStore operations).
   * @param {number} [options.chunkSize=500] - Size of text chunks for indexing.
   * @param {number} [options.topK=5] - Default number of results to retrieve.
   * @param {string} [options.namespace] - Default namespace for operations.
   * @param {object} [options.retryManager] - Optional RetryManager instance (defaults to 3 retries).
   */
  constructor({ 
    adapter, 
    vectorStore, 
    indexName, 
    chunkSize = 500, 
    topK = 5, 
    namespace, 
    retryManager = new RetryManager({ retries: 3, baseDelay: 1000, maxDelay: 10000 }) 
  } = {}) {
    if (!adapter) throw new Error("RAG requires an adapter.");
    if (vectorStore && !indexName) throw new Error("Vector store operations require an indexName.");
    this.adapter = adapter;
    this.vectorStore = vectorStore;
    this.indexName = indexName;
    this.chunkSize = chunkSize;
    this.topK = topK;
    this.namespace = namespace;
    this.retryManager = retryManager; // New: RetryManager for resilience
  }

  /**
   * Query with retrieval and generation.
   * @param {string} prompt - User query.
   * @param {object} [options] - { topK, namespace, filter, rerank, adapterOptions }
   * @returns {Promise<string>} - Generated response.
   */
  async query(prompt, options = {}) {
    if (!this.vectorStore) throw new Error("Query requires a vector store.");
    const context = await this.retryManager.execute(() => this.search(prompt, options));
    const fullPrompt = {
      system: options.system || "You are a helpful assistant using provided context.",
      user: `Context:\n${context.join("\n")}\n\nQuery: ${prompt}`,
    };
    const response = await this.retryManager.execute(() => 
      this.adapter.generateText(fullPrompt, options.adapterOptions || {})
    );
    return response;
  }

  /**
   * Search for relevant chunks/documents.
   * @param {string} query - Search query.
   * @param {object} [options] - { topK, namespace, filter, rerank }
   * @returns {Promise<string[]>} - Array of text results.
   */
  async search(query, options = {}) {
    if (!this.vectorStore) throw new Error("Search requires a vector store.");
    const embeddings = await this.retryManager.execute(() => this.adapter.embedChunks([query]));
    const queryVector = embeddings[0].embedding;
    const results = await this.retryManager.execute(() => 
      this.vectorStore.query({
        indexName: this.indexName,
        vector: queryVector,
        topK: options.topK || this.topK,
        namespace: options.namespace || this.namespace,
        filter: options.filter || {},
      })
    );

    let matches = results.matches.map(match => match.metadata.text);
    if (options.rerank) {
      matches = await this.retryManager.execute(() => this._rerank(query, matches, options.rerank));
    }
    return matches;
  }

  /**
   * Chunk text into smaller pieces.
   * @param {string} text - Text to chunk.
   * @param {number} [chunkSize] - Override default chunk size.
   * @returns {string[]} - Array of chunks.
   */
  chunk(text, chunkSize = this.chunkSize) {
    return chunkText(text, chunkSize);
  }

  /**
   * Index documents into the vector store.
   * @param {string|string[]} documents - Text(s) to index.
   * @param {object} [options] - { namespace, metadata }
   * @returns {Promise<string[]>} - Inserted vector IDs.
   */
  async index(documents, options = {}) {
    if (!this.vectorStore) throw new Error("Indexing requires a vector store.");
    console.log("Raw documents:", documents);
    const texts = Array.isArray(documents) ? documents : [documents];
    console.log("Texts:", texts);
    const validTexts = texts.filter(t => typeof t === 'string' && t.trim().length > 0);
    console.log("Valid texts:", validTexts);
    if (!validTexts.length) throw new Error("No valid text provided for indexing.");

    const chunkPromises = validTexts.map(text => this.chunk(text));
    const chunksArray = await Promise.all(chunkPromises);
    const chunks = chunksArray.flat();
    console.log("Chunks before embed:", chunks);

    if (!chunks.length || chunks.some(c => typeof c !== 'string' || !c.trim())) {
      throw new Error("Chunks must be a non-empty array of non-empty strings.");
    }
    const embeddings = await this.retryManager.execute(() => this.adapter.embedChunks(chunks));
    const vectors = embeddings.map((emb, i) => ({
      id: `${Date.now()}-${i}`,
      values: emb.embedding,
      metadata: { text: chunks[i], ...(options.metadata || {}) },
    }));
    const { insertedIds } = await this.retryManager.execute(() => 
      this.vectorStore.upsert({
        indexName: options.indexName || this.indexName,
        vectors,
        namespace: options.namespace || this.namespace,
      })
    );
    return insertedIds;
  }

  /**
   * Delete vectors or an entire namespace.
   * @param {object} options - { ids, namespace, all, indexName }
   * @returns {Promise<void>}
   */
  async delete(options = {}) {
    if (!this.vectorStore) throw new Error("Deletion requires a vector store.");
    if (options.all) {
      await this.retryManager.execute(() => 
        this.vectorStore.deleteAll({
          indexName: options.indexName || this.indexName,
          namespace: options.namespace || this.namespace,
        })
      );
    } else if (options.ids) {
      await this.retryManager.execute(() => 
        this.vectorStore.delete({
          indexName: options.indexName || this.indexName,
          ids: options.ids,
          namespace: options.namespace || this.namespace,
        })
      );
    } else {
      throw new Error("Delete requires either ids or all: true.");
    }
  }

  /**
   * Create a new index in the vector store.
   * @param {object} options - { indexName, dimension, metric, spec }
   * @returns {Promise<void>}
   */
  async createIndex(options = {}) {
    if (!this.vectorStore) throw new Error("createIndex requires a vector store.");
    const { indexName, dimension, metric = "cosine", spec } = options;
    if (!indexName || !dimension) throw new Error("createIndex requires indexName and dimension.");
    await this.retryManager.execute(() => 
      this.vectorStore.createIndex({ indexName, dimension, metric, spec })
    );
  }

  /**
   * List all indexes in the vector store.
   * @returns {Promise<string[]>} - Array of index names.
   */
  async listIndexes() {
    if (!this.vectorStore) throw new Error("listIndexes requires a vector store.");
    return await this.retryManager.execute(() => this.vectorStore.listIndexes());
  }

  /**
   * Update an existing index (e.g., replicas, pod type).
   * @param {object} options - { indexName, replicas, podType }
   * @returns {Promise<void>}
   */
  async updateIndex(options = {}) {
    if (!this.vectorStore) throw new Error("updateIndex requires a vector store.");
    const { indexName, replicas, podType } = options;
    if (!indexName) throw new Error("updateIndex requires indexName.");
    await this.retryManager.execute(() => 
      this.vectorStore.updateIndex({ indexName, replicas, podType })
    );
  }

  /**
   * Internal method to rerank search results (stub—requires adapter-specific logic).
   * @param {string} query - Original query.
   * @param {string[]} results - Retrieved text chunks.
   * @param {string} strategy - Reranking strategy (e.g., "cosine").
   * @returns {Promise<string[]>} - Reranked results.
   */
  async _rerank(query, results, strategy = "cosine") {
    console.warn("Reranking not fully implemented—returning original results.");
    return results; // Future: Add retry logic here if implemented
  }
}

module.exports = { RAG };