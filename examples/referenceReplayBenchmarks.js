const {
  Agent,
  Tool,
  RetryManager,
  EvalHarness,
  InMemoryRunStore,
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
            id: 'tool_use_replay_eval_1',
          },
        ],
      };
    }

    return { message: 'tool-eval-default' };
  }
}

async function main() {
  const retryManager = new RetryManager({ retries: 1, baseDelay: 1, maxDelay: 5 });
  const runStore = new InMemoryRunStore();
  const tool = new Tool({
    name: 'lookup_status',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
    implementation: async ({ query }) => ({ query, status: 'ok' }),
  });
  const agent = new Agent(new ToolEvalAdapter(), {
    tools: [tool],
    retryManager,
    runStore,
  });

  const originalRun = await agent.run('Use tool to check status');
  const harness = new EvalHarness({
    scenarios: [
      {
        id: 'replay-regression',
        run: async () => agent.replayRun(originalRun.id),
        assert: replayRun =>
          replayRun.output === originalRun.output &&
          replayRun.status === originalRun.status &&
          replayRun.steps.length === originalRun.steps.length,
      },
    ],
  });

  const report = await harness.run();
  console.dir(
    {
      originalRunId: originalRun.id,
      report,
    },
    { depth: null }
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
