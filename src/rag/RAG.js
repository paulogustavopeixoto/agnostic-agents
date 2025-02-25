// src/rag/RAG.js

const { chunkText } = require('../utils/chunkText');

class RAG {
  /**
   * @param {object} options
   * @param {object} options.adapter - Adapter for generation/embeddings (e.g., OpenAIAdapter).
   * @param {object} [options.vectorStore] - Vector store for retrieval/indexing (e.g., PineconeManager).
   * @param {string} [options.indexName] - Index name (required for vectorStore operations).
   * @param {number} [options.chunkSize=500] - Size of text chunks for indexing.
   * @param {number} [options.topK=5] - Default number of results to retrieve.
   * @param {string} [options.namespace] - Default namespace for operations.
   */
  constructor({ adapter, vectorStore, indexName, chunkSize = 500, topK = 5, namespace } = {}) {
    if (!adapter) throw new Error("RAG requires an adapter.");
    if (vectorStore && !indexName) throw new Error("Vector store operations require an indexName.");
    this.adapter = adapter;
    this.vectorStore = vectorStore;
    this.indexName = indexName;
    this.chunkSize = chunkSize;
    this.topK = topK;
    this.namespace = namespace;
  }

  /**
   * Query with retrieval and generation.
   * @param {string} prompt - User query.
   * @param {object} [options] - { topK, namespace, filter, rerank, adapterOptions }
   * @returns {Promise<string>} - Generated response.
   */
  async query(prompt, options = {}) {
    if (!this.vectorStore) throw new Error("Query requires a vector store.");
    const context = await this.search(prompt, options);
    const fullPrompt = {
      system: options.system || "You are a helpful assistant using provided context.",
      user: `Context:\n${context.join("\n")}\n\nQuery: ${prompt}`,
    };
    const response = await this.adapter.generateText(fullPrompt, options.adapterOptions || {});
    return response.message;
  }

  /**
   * Search for relevant chunks/documents.
   * @param {string} query - Search query.
   * @param {object} [options] - { topK, namespace, filter, rerank }
   * @returns {Promise<string[]>} - Array of text results.
   */
  async search(query, options = {}) {
    if (!this.vectorStore) throw new Error("Search requires a vector store.");
    const embeddings = await this.adapter.embedChunks([query]);
    const queryVector = embeddings[0].embedding;
    const results = await this.vectorStore.query({
      indexName: this.indexName,
      vector: queryVector,
      topK: options.topK || this.topK,
      namespace: options.namespace || this.namespace,
      filter: options.filter || {}, // Metadata filter
    });

    let matches = results.matches.map(match => match.metadata.text);
    if (options.rerank) {
      matches = await this._rerank(query, matches, options.rerank); // Optional reranking
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
    const texts = Array.isArray(documents) ? documents : [documents];
    const chunks = texts.flatMap(text => this.chunk(text));
    const embeddings = await this.adapter.embedChunks(chunks);
    const vectors = embeddings.map((emb, i) => ({
      id: `${Date.now()}-${i}`,
      values: emb.embedding,
      metadata: { text: chunks[i], ...(options.metadata || {}) }, // Allow custom metadata
    }));
    const { insertedIds } = await this.vectorStore.upsert({
      indexName: this.indexName,
      vectors,
      namespace: options.namespace || this.namespace,
    });
    return insertedIds;
  }

  /**
   * Delete vectors by IDs or namespace.
   * @param {object} options - { ids, namespace, all }
   * @returns {Promise<void>}
   */
  async delete(options = {}) {
    if (!this.vectorStore) throw new Error("Deletion requires a vector store.");
    if (options.all) {
      await this.vectorStore.deleteAll({
        indexName: this.indexName,
        namespace: options.namespace || this.namespace,
      });
    } else if (options.ids) {
      await this.vectorStore.delete({
        indexName: this.indexName,
        ids: options.ids,
        namespace: options.namespace || this.namespace,
      });
    } else {
      throw new Error("Delete requires either ids or all: true.");
    }
  }

  /**
   * Internal method to rerank search results (stub—requires adapter-specific logic).
   * @param {string} query - Original query.
   * @param {string[]} results - Retrieved text chunks.
   * @param {string} strategy - Reranking strategy (e.g., "cosine").
   * @returns {Promise<string[]>} - Reranked results.
   */
  async _rerank(query, results, strategy = "cosine") {
    // Placeholder: Implement reranking (e.g., cosine similarity with embeddings)
    console.warn("Reranking not fully implemented—returning original results.");
    return results; // Future: Add reranking logic with adapter embeddings
  }
}

module.exports = { RAG };