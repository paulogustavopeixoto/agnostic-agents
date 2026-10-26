class AgentError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class AdapterCapabilityError extends AgentError {
  constructor(message) { super(message); this.retryable = false; }
}

class InvalidToolCallError extends AgentError {
  constructor(message) { super(message); this.retryable = false; }
}

class ToolNotFoundError extends AgentError {}

class ToolExecutionError extends AgentError {}

class ToolPolicyError extends AgentError {
  constructor(message) { super(message); this.retryable = false; }
}

class ApprovalRequiredError extends AgentError {}

class RunNotFoundError extends AgentError {}

class RunPausedError extends AgentError {}

class RunCancelledError extends AgentError {
  constructor(message) { super(message); this.retryable = false; }
}

module.exports = {
  AgentError,
  AdapterCapabilityError,
  InvalidToolCallError,
  ToolNotFoundError,
  ToolExecutionError,
  ToolPolicyError,
  ApprovalRequiredError,
  RunNotFoundError,
  RunPausedError,
  RunCancelledError,
};
