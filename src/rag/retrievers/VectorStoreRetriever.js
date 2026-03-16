const { BaseRetriever } = require('./BaseRetriever');

class VectorStoreRetriever extends BaseRetriever {
  constructor({ adapter, vectorStore, indexName = null, namespace = null, topK = 5 } = {}) {
    super();
    this.adapter = adapter;
    this.vectorStore = vectorStore;
    this.indexName = indexName;
    this.namespace = namespace;
    this.topK = topK;
  }

  async search(query, options = {}) {
    const embeddings = await this.adapter.embedChunks([query]);
    const queryVector = embeddings[0].embedding;
    const results = await this.vectorStore.query({
      indexName: options.indexName || this.indexName,
      vector: queryVector,
      topK: options.topK || this.topK,
      namespace: options.namespace || this.namespace,
      filter: options.filter || {},
    });

    return {
      query,
      topK: options.topK || this.topK,
      namespace: options.namespace || this.namespace || null,
      filter: options.filter || {},
      matches: (results.matches || []).map((match, index) => ({
        id: match.id || `${Date.now()}-${index}`,
        text: match.metadata?.text || '',
        score: typeof match.score === 'number' ? match.score : null,
        metadata: match.metadata || {},
      })),
    };
  }
}

module.exports = { VectorStoreRetriever };
