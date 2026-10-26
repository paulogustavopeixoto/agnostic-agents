const { Tool } = require('../tools/adapters/Tool');
const { ProducerRuntime } = require('./ProducerRuntime');

/** Connects a producer to the existing Agent policy, approval, and tool trace path. */
class ProducerTool extends Tool {
  constructor({ name, description = '', parameters, runtime, operation, toContent,
    maxCallsPerRun = 1, metadata = {} } = {}) {
    if (!(runtime instanceof ProducerRuntime) || !runtime.producer.supports(operation) ||
        typeof toContent !== 'function' || !Number.isSafeInteger(maxCallsPerRun) || maxCallsPerRun < 1) {
      throw new TypeError('Invalid producer tool configuration.');
    }
    super({ name, description, parameters, metadata: {
      sideEffectLevel: 'external_write', retryabilityHint: 'never', ...metadata,
    }, implementation: async (args, context) => {
      const parent = context.run;
      if (!parent || typeof context.persistRun !== 'function') {
        throw new Error('ProducerTool requires an Agent run context.');
      }
      const content = await toContent(args);
      // Reserve before dispatch. Failed or uncertain calls still consume the limit.
      const counts = parent.state.producerToolCalls || {};
      const used = Object.hasOwn(counts, name) ? counts[name] : 0;
      if (!Number.isSafeInteger(used) || used < 0 || used >= maxCallsPerRun) {
        throw new Error('Producer tool call limit reached.');
      }
      parent.state.producerToolCalls = Object.fromEntries([
        ...Object.entries(counts).filter(([key]) => key !== name), [name, used + 1],
      ]);
      await context.persistRun();
      const child = await runtime.run({ operation, content }, {
        signal: context.signal,
        parentRunId: parent.id,
        rootRunId: parent.metadata.lineage.rootRunId,
        onRunCreated: async run => {
          parent.registerChildRun(run.id);
          await context.persistRun();
        },
      });
      if (child.status !== 'completed') throw new Error('Producer child run did not complete.');
      return { runId: child.id, ...child.output };
    } });
  }
}

module.exports = { ProducerTool };
