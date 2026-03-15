const { Agent, Tool } = require('../index');

class DemoAdapter {
  async generateText(messages, { tools = [] } = {}) {
    const hasToolResult = messages.some(message => message.role === 'function');
    if (hasToolResult) {
      const toolResult = [...messages].reverse().find(message => message.role === 'function');
      return { message: `Final answer: ${toolResult.content}` };
    }

    if (tools.length > 0) {
      return {
        message: '',
        toolCalls: [{ name: tools[0].name, arguments: { expression: '12 * 7' }, id: 'demo-tool-1' }],
      };
    }

    return { message: 'No tool available.' };
  }
}

async function main() {
  const calculator = new Tool({
    name: 'calculate',
    description: 'Evaluate a basic arithmetic expression.',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string' },
      },
      required: ['expression'],
    },
    implementation: async ({ expression }) => ({
      result: Function(`"use strict"; return (${expression})`)(),
    }),
  });

  const agent = new Agent(new DemoAdapter(), {
    tools: [calculator],
    description: 'Use tools when they help.',
  });

  console.log(await agent.sendMessage('What is 12 * 7?'));
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
