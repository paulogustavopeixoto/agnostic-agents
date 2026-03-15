const { Agent, Tool, RAG, LocalVectorStore } = require('../index');

class DemoAdapter {
  async generateText(messages, { tools = [] } = {}) {
    const hasToolResult = messages.some(message => message.role === 'function');
    if (hasToolResult) {
      const toolResult = [...messages].reverse().find(message => message.role === 'function');
      const retrievedContext = messages.find(
        message => message.role === 'user' && String(message.content).includes('Retrieved context:')
      );

      return {
        message: `Grounded answer using retrieved context and tool result.\n${retrievedContext.content}\nTool: ${toolResult.content}`,
      };
    }

    if (tools.length > 0) {
      return {
        message: '',
        toolCalls: [{ name: tools[0].name, arguments: { location: 'Lisbon' }, id: 'demo-rag-tool-1' }],
      };
    }

    return { message: 'No tools available.' };
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

  await rag.index(['Lisbon is the capital of Portugal and has Atlantic weather.']);

  const weatherTool = new Tool({
    name: 'get_weather',
    description: 'Return a mock weather report.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string' },
      },
      required: ['location'],
    },
    implementation: async ({ location }) => ({
      location,
      forecast: 'Sunny',
      temperatureC: 21,
    }),
  });

  const agent = new Agent(adapter, {
    tools: [weatherTool],
    rag,
    description: 'Use retrieval and tools together when they help.',
  });

  console.log(await agent.sendMessage('What should I know about Lisbon and what is the weather there?'));
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
