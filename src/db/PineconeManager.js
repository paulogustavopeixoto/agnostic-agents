
// src/db/PineconeManager.js
const { Pinecone } = require('@pinecone-database/pinecone');

class PineconeManager {
  /**
   * Creates a new PineconeManager instance.
   * 
   * @param {object} options
   * @param {string} options.apiKey - Pinecone API key
   * @param {string} [options.environment] - Pinecone environment (e.g., "us-east-1-aws")
   */
  constructor({ apiKey }) {
    if (!apiKey) {
      throw new Error("PineconeManager requires an apiKey.");
    }

    // 1) Construct the Pinecone client
    this.client = new Pinecone({ apiKey });
  }

  /**
   * Upserts a list of vector records into a Pinecone index under a specific namespace,
   * returning both the Pinecone API response and the list of inserted IDs.
   *
   * @example <caption>Usage Example</caption>
   * const vectors = [
   *   {
   *     id: "doc123-0",
   *     values: [0.123, 0.456, 0.789],
   *     metadata: { chunk_index: 0, text: "Hello World", input_id: "doc123" },
   *   },
   *   {
   *     id: "doc123-1",
   *     values: [0.987, 0.654, 0.321],
   *     metadata: { chunk_index: 1, text: "Some text snippet", input_id: "doc123" },
   *   },
   * ];
   * 
   * const { upsertResponse, insertedIds } = await pineconeManager.upsertVectors(
   *   "myIndexName",
   *   "myNamespace",
   *   vectors
   * );
   * console.log("Inserted IDs:", insertedIds);
   *
   * @param {string} indexName
   *   The name of your Pinecone index.
   *
   * @param {string} namespace
   *   The namespace to store these vectors under (e.g., "user123").
   *
   * @param {object[]} vectors
   *   An array of vector records. Each must have:
   *   - `id` (string): Unique ID for this vector
   *   - `values` (number[]): The embedding (float[]) to store
   *   - `metadata` (object, optional): Any additional info for the vector
   *
   * @returns {Promise<{ upsertResponse: any, insertedIds: string[] }>}
   *   An object containing the raw Pinecone response and an array of the inserted vector IDs.
   *
   * @throws {Error}
   *   Throws if the upsert call fails or if required parameters are missing.
   */
  async upsertVectors(indexName, namespace, vectors = []) {
    // 1) Retrieve the index object
    const index = this.client.Index(indexName);

    // 2) Extract the IDs right now (or after the call—either works)
    const insertedIds = vectors.map((v) => v.id);

    // 3) Execute the upsert
    try {
      const upsertResponse = await index.namespace(namespace).upsert(vectors);
      console.log("Upsert succeeded! Response:", upsertResponse);

      // 4) Return both the Pinecone response and the IDs
      return {
        upsertResponse,
        insertedIds,
      };
    } catch (error) {
      console.error("Upsert failed:", error);
      throw error;
    }
  }

  /**
   * Query Pinecone with an optional metadata filter.
   * 
   * @param {string} indexName
   * @param {number[]} queryVector - the query embedding as an array of floats
   * @param {object} [options]
   * @param {number} [options.topK=5] - how many results to retrieve
   * @param {string} [options.namespace=""] - e.g. "my_user_123"
   * @param {object} [options.filter={}]    - metadata filter for narrowing results
   * 
   * @returns {Promise<object>} Pinecone query response object
   */
  async queryVectors(
    indexName,
    queryVector,
    {
      topK = 5,
      namespace = "",
      filter = {},
    } = {}
  ) {
    try {
      // 1) Retrieve the index
      const index = this.client.Index(indexName).namespace(namespace);

      // 2) Build the query request
      const queryRequest = {
        vector: queryVector,
        topK,
        includeMetadata: true
      };

      // 3) If a filter is present, attach it
      if (Object.keys(filter).length > 0) {
        queryRequest.filter = filter;
      }

      // 4) Execute query
      const queryResponse = await index.query(queryRequest);
      return queryResponse;
    } catch (error) {
      console.error("Error querying Pinecone:", error);
      throw error;
    }
  }

  /**
   * Deletes vectors from Pinecone by vector IDs.
   * 
   * @param {string} indexName
   * @param {string[]} vectorIds
   * @param {string} [namespace=""]
   * 
   * @returns {Promise<any>} The Pinecone delete response
   */
  async deleteVectors(indexName, vectorIds, namespace = "") {
    try {
      const index = this.client.Index(indexName).namespace(namespace);
      const deleteResponse = await index.delete({ ids: vectorIds });
      console.log("Delete response:", deleteResponse);
      return deleteResponse;
    } catch (error) {
      console.error("Error deleting vectors:", error);
      throw error;
    }
  }

  /**
   * Deletes an entire namespace. Use with caution!
   * 
   * @param {string} indexName
   * @param {string} namespace
   */
  async deleteNamespace(indexName, namespace) {
    try {
      const index = this.client.Index(indexName);
      const deleteResponse = await index.delete({ deleteAll: true, namespace });
      console.log(`Namespace "${namespace}" deleted. Response:`, deleteResponse);
      return deleteResponse;
    } catch (error) {
      console.error("Error deleting namespace:", error);
      throw error;
    }
  }

  // You can add more features:
  // - createIndex
  // - listIndexes
  // - updateIndex
  // - etc.
}

module.exports = { PineconeManager };