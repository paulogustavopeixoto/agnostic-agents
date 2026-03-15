class AgentError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class AdapterCapabilityError extends AgentError {}

class InvalidToolCallError extends AgentError {}

class ToolNotFoundError extends AgentError {}

class ToolExecutionError extends AgentError {}

module.exports = {
  AgentError,
  AdapterCapabilityError,
  InvalidToolCallError,
  ToolNotFoundError,
  ToolExecutionError,
};
