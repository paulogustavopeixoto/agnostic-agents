const { Agent, RAG, LocalVectorStore } = require('../index');

class DemoAdapter {
  async generateText(messages) {
    const prompt = messages.map(message => String(message.content || '')).join('\n');
    return { message: `Grounded answer based on:\n${prompt}` };
  }

  async embedChunks(chunks) {
    return chunks.map(chunk => ({
      embedding: [chunk.length, chunk.split(/\s+/).length, 1],
    }));
  }
}

async function main() {
  const adapter = new DemoAdapter();
  const rag = new RAG({
    adapter,
    vectorStore: new LocalVectorStore(),
  });

  await rag.index(['AI ethics includes fairness, transparency, and accountability.']);

  const agent = new Agent(adapter, {
    rag,
    description: 'Use retrieved context when it is relevant.',
  });

  console.log(await agent.sendMessage('What does AI ethics include?'));
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
