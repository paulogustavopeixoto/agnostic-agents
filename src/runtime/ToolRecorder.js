const { Tool } = require('../tools/adapters/Tool');

class ToolRecorder {
  constructor({ records = [] } = {}) {
    this.records = Array.isArray(records) ? records : [];
  }

  wrap(tool, metadata = {}) {
    if (!(tool instanceof Tool)) {
      throw new Error('ToolRecorder.wrap requires a Tool instance.');
    }

    const recorder = this;
    return new Tool({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      outputSchema: tool.outputSchema,
      strict: tool.strict,
      metadata: {
        ...tool.metadata,
        tags: [...new Set([...(tool.metadata?.tags || []), 'recorded'])],
      },
      implementation: async (args, context = {}) => {
        const startedAt = new Date().toISOString();
        try {
          const result = await tool.call(args, context);
          recorder.records.push({
            tool: tool.name,
            args,
            context,
            result,
            error: null,
            startedAt,
            finishedAt: new Date().toISOString(),
            metadata,
          });
          return result;
        } catch (error) {
          recorder.records.push({
            tool: tool.name,
            args,
            context,
            result: null,
            error: {
              message: error.message,
            },
            startedAt,
            finishedAt: new Date().toISOString(),
            metadata,
          });
          throw error;
        }
      },
    });
  }

  export() {
    return {
      version: '1.0.0',
      records: this.records.slice(),
    };
  }
}

module.exports = { ToolRecorder };
