const { Tool } = require('../tools/adapters/Tool');

class ToolMockBuilder {
  static build({ toolName, records = [], description = 'Mock tool built from recorded interactions.', fallback = null } = {}) {
    if (!toolName) {
      throw new Error('ToolMockBuilder requires toolName.');
    }

    const matching = records.filter(record => record.tool === toolName);

    return new Tool({
      name: toolName,
      description,
      parameters: {
        type: 'object',
        properties: {},
      },
      implementation: async (args = {}) => {
        const hit = matching.find(record => JSON.stringify(record.args || {}) === JSON.stringify(args || {}));
        if (hit) {
          if (hit.error) {
            throw new Error(hit.error.message || `Mocked tool error for ${toolName}`);
          }
          return hit.result;
        }

        if (typeof fallback === 'function') {
          return fallback(args);
        }

        throw new Error(`No recorded tool response for "${toolName}" and args ${JSON.stringify(args)}`);
      },
      metadata: {
        tags: ['mock'],
        sideEffectLevel: 'none',
      },
    });
  }
}

module.exports = { ToolMockBuilder };
