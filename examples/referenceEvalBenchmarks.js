const {
  Agent,
  Tool,
  RetryManager,
  RAG,
  LocalVectorStore,
  EvalHarness,
} = require('../index');

class ToolEvalAdapter {
  async generateText(messages, { tools = [] } = {}) {
    const text = messages.map(message => String(message.content || '')).join('\n');

    if (messages.some(message => message.role === 'function')) {
      const lastResult = [...messages].reverse().find(message => message.role === 'function');
      return { message: `Final answer based on ${lastResult.content}` };
    }

    if (tools.length > 0 && text.includes('Use tool')) {
      return {
        message: '',
        toolCalls: [
          {
            name: tools[0].name,
            arguments: { query: 'status' },
            id: 'tool_use_eval_demo_1',
          },
        ],
      };
    }

    return { message: 'tool-eval-default' };
  }
}

class RagEvalAdapter {
  async generateText(messages) {
    const blob = messages.map(message => String(message.content || '')).join('\n');
    const match = blob.match(/Retrieved context:\s*([\s\S]+)/);
    const grounded = match ? match[1].trim().split('\n')[0] : 'missing-context';
    return { message: `Grounded answer: ${grounded}` };
  }

  async embedChunks(chunks) {
    return chunks.map(chunk => ({
      embedding: [chunk.length, chunk.split(' ').length, 1],
    }));
  }
}

async function main() {
  const retryManager = new RetryManager({ retries: 1, baseDelay: 1, maxDelay: 5 });
  const tool = new Tool({
    name: 'lookup_status',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
    implementation: async ({ query }) => ({ query, status: 'ok' }),
  });
  const toolAgent = new Agent(new ToolEvalAdapter(), {
    tools: [tool],
    retryManager,
  });

  const rag = new RAG({
    adapter: new RagEvalAdapter(),
    vectorStore: new LocalVectorStore(),
  });
  await rag.index(['Runtime control requires replay, branching, and inspection.']);
  const ragAgent = new Agent(new RagEvalAdapter(), {
    rag,
    retryManager,
    description: 'Use retrieved context when it is relevant.',
  });

  const harness = new EvalHarness({
    scenarios: [
      {
        id: 'prompt-regression',
        run: async () => 'runtime control ready',
        assert: output => output === 'runtime control ready',
      },
      {
        id: 'tool-selection-accuracy',
        run: async () => toolAgent.run('Use tool to check status'),
        assert: run =>
          run.toolCalls.some(call => (call.toolName || call.name) === 'lookup_status') &&
          String(run.output || '').includes('status'),
      },
      {
        id: 'rag-grounding',
        run: async () =>
          ragAgent.sendMessage('What does runtime control require according to the retrieved context?'),
        assert: output => String(output).includes('Runtime control requires replay, branching, and inspection.'),
      },
    ],
  });

  const report = await harness.run();
  console.dir(report, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
