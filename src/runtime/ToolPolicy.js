class ToolPolicy {
  constructor({
    defaultAction = 'allow',
    approvalHandler = null,
    evaluate = null,
    beforeExecute = null,
    afterExecute = null,
    verify = null,
    rules = [],
  } = {}) {
    this.defaultAction = defaultAction;
    this.approvalHandler = approvalHandler;
    this.customEvaluate = evaluate;
    this.beforeExecute = beforeExecute;
    this.afterExecute = afterExecute;
    this.customVerify = verify;
    this.rules = [...rules];
  }

  evaluate(tool, args, context = {}) {
    if (typeof this.customEvaluate === 'function') {
      return this.customEvaluate(tool, args, context);
    }

    const metadata = tool?.metadata || {};
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

  async resolveApproval(request, context = {}) {
    if (typeof this.approvalHandler === 'function') {
      return this.approvalHandler(request, context);
    }

    return { approved: false, reason: 'No approval handler configured.' };
  }

  async onBeforeExecute(tool, args, context = {}) {
    if (typeof this.beforeExecute === 'function') {
      return this.beforeExecute(tool, args, context);
    }

    return { action: 'allow' };
  }

  async onAfterExecute(tool, result, context = {}) {
    if (typeof this.afterExecute === 'function') {
      return this.afterExecute(tool, result, context);
    }

    return result;
  }

  async verify(tool, args, context = {}) {
    if (typeof this.customVerify === 'function') {
      return this.customVerify(tool, args, context);
    }

    return { action: 'allow', reason: null };
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
