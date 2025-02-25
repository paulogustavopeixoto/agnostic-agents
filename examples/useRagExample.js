const { Agent, Task, Orchestrator, RAG, OpenAIAdapter, PineconeManager } = require('../index');
require('dotenv').config();

(async () => {
  const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY);
  const vectorStore = new PineconeManager({ apiKey: process.env.PINECONE_API_KEY });
  const rag = new RAG({ adapter, vectorStore, indexName: 'test-index3' });

  await rag.index(["AI ethics involve fairness."]);

  const agent = new Agent(adapter, { description: "Ethics expert", rag });
  const task = new Task({ description: "Explain AI ethics", agent, rag });
  const orchestrator = new Orchestrator({ tasks: [task], rag });

  console.log(await agent.sendMessage("What are AI ethics?")); // Uses RAG
  console.log(await orchestrator.kickoff()); // Task uses RAG
})();