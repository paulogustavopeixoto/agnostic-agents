class RunRecipe {
  constructor({ id, tools = [], policy = null, routing = null, memory = null, approvals = null, metadata = {} } = {}) {
    if (!id) {
      throw new Error('RunRecipe requires id.');
    }
    this.id = id;
    this.tools = tools;
    this.policy = policy;
    this.routing = routing;
    this.memory = memory;
    this.approvals = approvals;
    this.metadata = metadata;
  }

  buildAgentOptions(overrides = {}) {
    return {
      tools: this.tools,
      toolPolicy: this.policy,
      router: this.routing,
      memory: this.memory,
      approvalInbox: this.approvals,
      ...overrides,
    };
  }
}

module.exports = { RunRecipe };
