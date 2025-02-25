const { RAG, OpenAIAdapter, PineconeManager } = require('../index');
require('dotenv').config();

(async () => {
  const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY);
  const vectorStore = new PineconeManager({ apiKey: process.env.PINECONE_API_KEY });
  const rag = new RAG({
    adapter,
    vectorStore,
    indexName: process.env.PINECONE_INDEX_NAME || 'test-index3',
    chunkSize: 300,
    topK: 3,
  });

  console.log("Creating index...");
  //await rag.createIndex({
  //  indexName: 'test-index3',
  //  dimension: 1536,
  //  spec: { serverless: { cloud: "aws", region: "us-east-1" } },
  //});

  console.log("Listing indexes...");
  //const indexes = await rag.listIndexes();
  //console.log("Indexes:", indexes);

  console.log("Indexing...");
  const insertedIds = await rag.index(["AI is cool"], { metadata: { source: "test" } });
  console.log("Inserted IDs:", insertedIds);

  console.log("\n=== Test Query ===");
  const answer = await rag.query("What is AI?", { filter: { source: "test" } });
  console.log("Answer:", answer);
  
  console.log("\n=== Test Delete ===");
  await rag.delete({indexName: 'test-index3', ids: insertedIds });
  console.log("Deletion completed.");
})().catch((error) => {
  console.error("Test Error:", error.message);
});