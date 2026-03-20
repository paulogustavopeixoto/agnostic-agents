class ToolSandboxRunner {
  constructor({ simulator = null } = {}) {
    this.simulator = simulator;
  }

  async run(tool, args = {}, { mode = 'simulate', context = {} } = {}) {
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

    return {
      request,
      simulated: false,
      result: await tool.call(args, context),
    };
  }
}

module.exports = { ToolSandboxRunner };
