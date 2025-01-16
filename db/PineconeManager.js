
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
  constructor({ apiKey, environment }) {
    if (!apiKey) {
      throw new Error("PineconeManager requires an apiKey.");
    }

    // 1) Construct the Pinecone client
    this.client = new Pinecone({ apiKey, environment });
  }

  /**
   * Upserts embeddings into Pinecone, with metadata and a specified namespace.
   * 
   * @param {string} indexName       - name of your Pinecone index
   * @param {string[]} chunks        - array of text chunks
   * @param {object[]} embeddings    - array of embedding objects (each must have `.embedding` array)
   * @param {object} options
   * @param {string} options.inputId
   * @param {string} [options.outputId]
   * @param {string} [options.docType]
   * @param {string} [options.namespace] - e.g. "my_user_123"
   * 
   * @returns {Promise<any>} - the Pinecone upsert response
   */
  async upsertVectors(
    indexName,
    chunks,
    embeddings,
    {
      inputId = "0",
      outputId = "",
      docType = "",
      namespace = ""
    } = {}
  ) {
    // 2.1 Retrieve the index object
    const index = this.client.Index(indexName);

    // 2.2 Construct the upsert request
    // Each embedding + chunk is a single record
    const vectors = embeddings.map((obj, i) => ({
      id: `${inputId}-${i}`,
      values: obj.embedding,  // the float array
      metadata: {
        chunk_index: i,
        text: chunks[i],
        input_id: inputId,
        output_id: outputId,
        doc_type: docType
      },
    }));

    // 3) Execute the upsert
    try {
      const upsertResponse = await index.namespace(namespace).upsert(vectors);
      console.log("Upsert succeeded! Response:", upsertResponse);
      return upsertResponse;
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