// examples/pineconeExample.js
const { PineconeManager } = require('../index');

(async () => {
  // 1) Initialize the manager
  const pineconeManager = new PineconeManager({
    apiKey: process.env.PINECONE_API_KEY
  });

  // 2) Upsert sample
  const indexName = "my-index";
  const textChunks = ["Hello world", "Another chunk"];
  const embeddings = [
    { embedding: [0.05, 0.87, 0.11] },  // example vector
    { embedding: [0.23, 0.42, 0.99] }
  ];

  await pineconeManager.upsertVectors(indexName, textChunks, embeddings, {
    inputId: "doc123",
    docType: "example",
    namespace: "testNamespace"
  });

  // 3) Query sample
  const queryEmbedding = [0.04, 0.88, 0.12];
  const response = await pineconeManager.queryVectors(indexName, queryEmbedding, {
    topK: 3,
    namespace: "testNamespace",
    filter: { doc_type: { "$eq": "example" } },
  });

  console.log("Query Results:", JSON.stringify(response, null, 2));

  // 4) Delete sample
  await pineconeManager.deleteVectors(indexName, ["doc123-0", "doc123-1"], "testNamespace");

  // 5) Optionally delete the entire namespace (CAREful!)
  // await pineconeManager.deleteNamespace(indexName, "testNamespace");
})();