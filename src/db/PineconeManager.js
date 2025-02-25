const { Pinecone } = require('@pinecone-database/pinecone');

class PineconeManager {
  constructor({ apiKey }) {
    if (!apiKey) throw new Error("PineconeManager requires an apiKey.");
    this.client = new Pinecone({ apiKey });
  }

  /**
   * Upsert vectors into a Pinecone index.
   * @param {object} options
   * @param {string} options.indexName - Pinecone index name.
   * @param {object[]} options.vectors - Array of { id, values, metadata }.
   * @param {string} [options.namespace=""] - Namespace for vectors.
   * @returns {Promise<{ insertedIds: string[] }>}
   */
  async upsert({ indexName, vectors, namespace = "" }) {
    const index = this.client.Index(indexName).namespace(namespace);
    const insertedIds = vectors.map(v => v.id);
    const upsertResponse = await index.upsert(vectors);
    console.log("Upsert succeeded! Response:", upsertResponse);
    return { insertedIds };
  }

  /**
   * Query vectors in a Pinecone index.
   * @param {object} options
   * @param {string} options.indexName - Pinecone index name.
   * @param {number[]} options.vector - Query embedding.
   * @param {number} [options.topK=5] - Number of results.
   * @param {string} [options.namespace=""] - Namespace.
   * @param {object} [options.filter={}] - Metadata filter.
   * @returns {Promise<{ matches: { id: string, score: number, metadata: object }[] }>}
   */
  async query({ indexName, vector, topK = 5, namespace = "", filter = {} }) {
    const index = this.client.Index(indexName).namespace(namespace);
    const queryRequest = {
      vector,
      topK,
      includeMetadata: true,
    };
    if (Object.keys(filter).length > 0) queryRequest.filter = filter;
    return await index.query(queryRequest);
  }

  /**
   * Deletes specific vectors by their IDs from a Pinecone index within a given namespace.
   * @param {object} options - Configuration for the deletion operation.
   * @param {string} options.indexName - The name of the Pinecone index.
   * @param {string[]} options.ids - Array of vector IDs to delete.
   * @param {string} [options.namespace=""] - The namespace within the index.
   * @returns {Promise<void>} - Resolves when deletion is complete.
   * @throws {Error} - Throws if the index or vectors are not found, or API fails.
   */
  async delete({ indexName, ids, namespace = "" }) {
    const index = this.client.Index(indexName);
    const deleteResponse = await index.namespace(namespace).deleteMany(ids);
    console.log("Delete response:", deleteResponse);
  }

  /**
   * Deletes all vectors within a specified namespace of a Pinecone index.
   * @param {object} options - Configuration for the deletion operation.
   * @param {string} options.indexName - The name of the Pinecone index.
   * @param {string} options.namespace - The namespace to clear.
   * @returns {Promise<void>} - Resolves when deletion is complete.
   * @throws {Error} - Throws if the index or namespace is not found, or API fails.
   */
  async deleteAll({ indexName, namespace }) {
    const index = this.client.Index(indexName);
    const deleteResponse = await index.delete({ deleteAll: true, namespace });
    console.log(`Namespace "${namespace}" deleted. Response:`, deleteResponse);
  }

  /**
   * Create a new Pinecone index.
   * @param {object} options
   * @param {string} options.indexName - Name of the new index.
   * @param {number} options.dimension - Dimension of vectors (e.g., 1536 for OpenAI).
   * @param {string} [options.metric="cosine"] - Similarity metric (cosine, euclidean, dotproduct).
   * @param {object} [options.spec] - { pods: { pod_type, replicas } } or { serverless: { cloud, region } }
   * @returns {Promise<void>}
   */
  async createIndex({ indexName, dimension, metric = "cosine", spec = { serverless: { cloud: "aws", region: "us-east-1" } } }) {
    if (!indexName || !dimension) throw new Error("createIndex requires indexName and dimension.");
    await this.client.createIndex({
      name: indexName,
      dimension,
      metric,
      spec, // Default to serverless AWS us-east-1
    });
    console.log(`Index "${indexName}" created.`);
  }

  /**
   * List all Pinecone indexes.
   * @returns {Promise<string[]>} - Array of index names.
   */
  async listIndexes() {
    const indexes = await this.client.listIndexes();
    return indexes.indexes.map(index => index.name);
  }

  /**
   * Update an existing Pinecone index (e.g., replicas).
   * @param {object} options
   * @param {string} options.indexName - Index name to update.
   * @param {number} [options.replicas] - Number of replicas.
   * @param {string} [options.podType] - Pod type (e.g., "p1.x1").
   * @returns {Promise<void>}
   */
  async updateIndex({ indexName, replicas, podType }) {
    const updateSpec = {};
    if (replicas !== undefined) updateSpec.replicas = replicas;
    if (podType) updateSpec.pod_type = podType;
    if (Object.keys(updateSpec).length === 0) throw new Error("updateIndex requires replicas or podType.");
    await this.client.configureIndex({ name: indexName, spec: updateSpec });
    console.log(`Index "${indexName}" updated.`);
  }
}

module.exports = { PineconeManager };