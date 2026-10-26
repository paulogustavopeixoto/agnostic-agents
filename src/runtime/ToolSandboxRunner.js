class ToolSandboxRunner {
  constructor({ simulator = null } = {}) {
    this.simulator = simulator;
  }

  async run(tool, args = {}, { mode = 'simulate', context = {} } = {}) {
    if (!['simulate', 'dry_run'].includes(mode)) {
      throw new Error('Unsupported sandbox mode.');
    }
    const request = {
      tool: tool.name,
      args,
      mode,
      metadata: tool.metadata || {},
    };

    if (mode === 'dry_run') {
      return {
        request,
        simulated: true,
        result: null,
      };
    }

    if (typeof this.simulator === 'function') {
      return {
        request,
        simulated: true,
        result: await this.simulator(tool, args, context),
      };
    }

    throw new Error('Simulation requires an explicit simulator; real tool execution is disabled.');
  }
}

module.exports = { ToolSandboxRunner };
