class BaseAppSpec {
  constructor() {}

  /**
   * Transform arguments before sending to the API
   * Override in subclasses.
   */
  transformArgs(actionKey, args) {
    return args;
  }

  /**
   * Optional: post-process output from API
   */
  transformResult(actionKey, result) {
    return result;
  }

  /**
   * Optional: map semantic aliases
   */
  getAliases() {
    return {};
  }
}

module.exports = { BaseAppSpec };