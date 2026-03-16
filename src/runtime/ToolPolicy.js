class ToolPolicy {
  constructor({
    defaultAction = 'allow',
    approvalHandler = null,
    evaluate = null,
    beforeExecute = null,
    afterExecute = null,
  } = {}) {
    this.defaultAction = defaultAction;
    this.approvalHandler = approvalHandler;
    this.customEvaluate = evaluate;
    this.beforeExecute = beforeExecute;
    this.afterExecute = afterExecute;
  }

  evaluate(tool, args, context = {}) {
    if (typeof this.customEvaluate === 'function') {
      return this.customEvaluate(tool, args, context);
    }

    const metadata = tool?.metadata || {};

    if (metadata.executionPolicy === 'deny') {
      return { action: 'deny', reason: 'Tool policy denies execution.' };
    }

    if (metadata.executionPolicy === 'require_approval') {
      return { action: 'require_approval', reason: 'Tool requires explicit approval.' };
    }

    return { action: this.defaultAction, reason: null };
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
}

module.exports = { ToolPolicy };
