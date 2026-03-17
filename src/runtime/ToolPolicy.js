/**
 * Policy layer for tool execution.
 * Supports metadata-driven policy, declarative rules, host approval hooks,
 * and explicit allow/deny lists for public runtime deployments.
 */
class ToolPolicy {
  /**
   * @param {object} [options]
   * @param {'allow'|'deny'|'require_approval'} [options.defaultAction]
   * @param {Function|null} [options.approvalHandler]
   * @param {Function|null} [options.evaluate]
   * @param {Function|null} [options.beforeExecute]
   * @param {Function|null} [options.afterExecute]
   * @param {Function|null} [options.verify]
   * @param {Array<object>} [options.rules]
   * @param {string[]|string|null} [options.allowTools]
   * @param {string[]|string|null} [options.denyTools]
   */
  constructor({
    defaultAction = 'allow',
    approvalHandler = null,
    evaluate = null,
    beforeExecute = null,
    afterExecute = null,
    verify = null,
    rules = [],
    allowTools = null,
    denyTools = null,
  } = {}) {
    this.defaultAction = defaultAction;
    this.approvalHandler = approvalHandler;
    this.customEvaluate = evaluate;
    this.beforeExecute = beforeExecute;
    this.afterExecute = afterExecute;
    this.customVerify = verify;
    this.rules = [...rules];
    this.allowTools = allowTools ? new Set(Array.isArray(allowTools) ? allowTools : [allowTools]) : null;
    this.denyTools = denyTools ? new Set(Array.isArray(denyTools) ? denyTools : [denyTools]) : null;
  }

  /**
   * Returns the policy decision for a tool call before execution begins.
   *
   * @param {object} tool
   * @param {object} args
   * @param {object} [context]
   * @returns {{action:string, reason:string|null, source:string, ruleId?:string|null}}
   */
  evaluate(tool, args, context = {}) {
    if (typeof this.customEvaluate === 'function') {
      return this.customEvaluate(tool, args, context);
    }

    const metadata = tool?.metadata || {};
    const toolName = tool?.name || null;

    if (toolName && this.denyTools?.has(toolName)) {
      return {
        action: 'deny',
        reason: `Tool "${toolName}" is blocked by policy.`,
        source: 'denylist',
      };
    }

    if (toolName && this.allowTools && !this.allowTools.has(toolName)) {
      return {
        action: 'deny',
        reason: `Tool "${toolName}" is not in the policy allowlist.`,
        source: 'allowlist',
      };
    }

    const matchedRule = this.rules.find(rule => this._matchesRule(rule, tool, args, context));

    if (matchedRule) {
      return {
        action: matchedRule.action || this.defaultAction,
        reason: matchedRule.reason || null,
        ruleId: matchedRule.id || null,
        source: 'rule',
      };
    }

    if (metadata.executionPolicy === 'deny') {
      return { action: 'deny', reason: 'Tool policy denies execution.', source: 'metadata' };
    }

    if (metadata.executionPolicy === 'require_approval') {
      return {
        action: 'require_approval',
        reason: 'Tool requires explicit approval.',
        source: 'metadata',
      };
    }

    return { action: this.defaultAction, reason: null, source: 'default' };
  }

  /**
   * Delegates approval resolution to the configured host approval handler.
   *
   * @param {object} request
   * @param {object} [context]
   * @returns {Promise<{approved:boolean, reason:string}>}
   */
  async resolveApproval(request, context = {}) {
    if (typeof this.approvalHandler === 'function') {
      return this.approvalHandler(request, context);
    }

    return { approved: false, reason: 'No approval handler configured.' };
  }

  /**
   * Hook invoked immediately before a tool implementation is executed.
   *
   * @param {object} tool
   * @param {object} args
   * @param {object} [context]
   * @returns {Promise<object>}
   */
  async onBeforeExecute(tool, args, context = {}) {
    if (typeof this.beforeExecute === 'function') {
      return this.beforeExecute(tool, args, context);
    }

    return { action: 'allow' };
  }

  /**
   * Hook invoked after a tool implementation succeeds.
   *
   * @param {object} tool
   * @param {*} result
   * @param {object} [context]
   * @returns {Promise<*>}
   */
  async onAfterExecute(tool, result, context = {}) {
    if (typeof this.afterExecute === 'function') {
      return this.afterExecute(tool, result, context);
    }

    return result;
  }

  /**
   * Optional verifier hook for tool calls that require explicit post-checks.
   *
   * @param {object} tool
   * @param {object} args
   * @param {object} [context]
   * @returns {Promise<{action:string, reason:string|null}>}
   */
  async verify(tool, args, context = {}) {
    if (typeof this.customVerify === 'function') {
      return this.customVerify(tool, args, context);
    }

    return { action: 'allow', reason: null };
  }

  addRule(rule = {}) {
    this.rules.push(rule);
    return rule;
  }

  addRules(rules = []) {
    const normalizedRules = Array.isArray(rules) ? rules : [rules];
    this.rules.push(...normalizedRules);
    return normalizedRules;
  }

  _matchesRule(rule = {}, tool, args = {}, context = {}) {
    if (typeof rule.match === 'function') {
      return rule.match(tool, args, context) === true;
    }

    const metadata = tool?.metadata || {};
    const toolName = tool?.name || null;
    const tags = metadata.tags || [];
    const authRequirements = metadata.authRequirements || [];
    const sideEffectLevel = metadata.sideEffectLevel || null;
    const runState = context.run?.state || {};

    const matchList = (value, actual) => {
      if (!value) return true;
      const values = Array.isArray(value) ? value : [value];
      return values.includes(actual);
    };

    const includesAll = (required = [], actual = []) =>
      required.every(item => actual.includes(item));

    const stateMatches = (expected = {}, actual = {}) =>
      Object.entries(expected).every(([key, value]) => actual[key] === value);

    if (!matchList(rule.toolName || rule.toolNames, toolName)) {
      return false;
    }

    if (rule.sideEffectLevel || rule.sideEffectLevels) {
      if (!matchList(rule.sideEffectLevel || rule.sideEffectLevels, sideEffectLevel)) {
        return false;
      }
    }

    if (rule.tags && !includesAll(rule.tags, tags)) {
      return false;
    }

    if (rule.authRequirements && !includesAll(rule.authRequirements, authRequirements)) {
      return false;
    }

    if (rule.state && !stateMatches(rule.state, runState)) {
      return false;
    }

    return true;
  }
}

module.exports = { ToolPolicy };
