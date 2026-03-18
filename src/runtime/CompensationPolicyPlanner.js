const { PolicyPack } = require('./PolicyPack');
const { PolicyScopeResolver } = require('./PolicyScopeResolver');
const { PolicySimulator } = require('./PolicySimulator');
const { PolicyEvaluationRecord } = require('./PolicyEvaluationRecord');
const { PolicyDecisionReport } = require('./PolicyDecisionReport');
const { ToolPolicy } = require('./ToolPolicy');

class CompensationPolicyPlanner {
  constructor({
    policyPack = null,
    toolPolicy = null,
    policyScopeResolver = null,
    scopes = null,
    fallbackAction = 'manual_review',
    actionMetadata = {},
  } = {}) {
    this.policyScopeResolver =
      policyScopeResolver instanceof PolicyScopeResolver
        ? policyScopeResolver
        : new PolicyScopeResolver(policyScopeResolver || {});
    this.policyPack = this._resolvePolicyPack({ policyPack, toolPolicy, scopes });
    this.simulator = new PolicySimulator({
      policyPack: this.policyPack,
      toolPolicy,
    });
    this.fallbackAction = fallbackAction;
    this.actionMetadata = { ...actionMetadata };
  }

  plan(entries = [], context = {}) {
    const items = (entries || []).map(entry => this._evaluateEntry(entry, context));
    const blocked = items.filter(item => item.policyDecision.action === 'deny');
    const requiresApproval = items.filter(item => item.policyDecision.action === 'require_approval');

    return {
      items,
      summary: {
        total: items.length,
        blocked: blocked.length,
        approvalsRequired: requiresApproval.length,
        autoCompensate: items.filter(item => item.recommendedAction === 'auto_compensate').length,
        manualReview: items.filter(item => item.recommendedAction === 'manual_review').length,
      },
      recommendedAction:
        blocked[0]?.recommendedAction ||
        requiresApproval[0]?.recommendedAction ||
        items[0]?.recommendedAction ||
        this.fallbackAction,
    };
  }

  createEvaluationRecord(entries = [], context = {}) {
    const plan = this.plan(entries, context);
    const report = new PolicyDecisionReport({
      mode: 'compensation_policy_plan',
      policyPack: this.policyPack?.toJSON?.() || this.policyPack,
      decisions: plan.items.map(item => item.policyDecision),
      metadata: {
        recommendedAction: plan.recommendedAction,
      },
    });

    return new PolicyEvaluationRecord({
      subject: {
        type: 'compensation_plan',
        runId: context.runId || null,
      },
      report: report.toJSON(),
      metadata: {
        recommendedAction: plan.recommendedAction,
        blocked: plan.summary.blocked,
      },
    });
  }

  _evaluateEntry(entry = {}, context = {}) {
    const request = this._buildRequest(entry, context);
    const policyDecision = this.simulator.simulateRequest(request.tool, request.args, request.context);

    return {
      entry,
      policyDecision,
      recommendedAction: this._mapDecisionToAction(policyDecision.action, entry),
      reason: policyDecision.reason || entry.reason || null,
    };
  }

  _mapDecisionToAction(action, entry = {}) {
    if (action === 'allow') {
      return entry.compensationHandler ? 'auto_compensate' : 'manual_review';
    }
    if (action === 'require_approval') {
      return 'approval_required';
    }
    return this.fallbackAction;
  }

  _buildRequest(entry = {}, context = {}) {
    return {
      tool: {
        name: `compensation:${entry.toolName || entry.stepId || 'unknown'}`,
        metadata: {
          sideEffectLevel: entry.sideEffectLevel || 'external_write',
          tags: ['compensation', ...(entry.tags || [])],
          ...this.actionMetadata[entry.toolName || entry.stepId || 'unknown'],
        },
      },
      args: {
        runId: context.runId || null,
        stepId: entry.stepId || null,
      },
      context: {
        ...context,
        stage: 'compensation',
      },
    };
  }

  _resolvePolicyPack({ policyPack, toolPolicy, scopes }) {
    if (scopes) {
      return this.policyScopeResolver.resolve(scopes);
    }

    if (policyPack) {
      return policyPack instanceof PolicyPack ? policyPack : PolicyPack.fromJSON(policyPack);
    }

    if (toolPolicy) {
      return PolicyPack.fromToolPolicy(
        toolPolicy instanceof ToolPolicy ? toolPolicy : new ToolPolicy(toolPolicy),
        {
          name: 'compensation-policy-planner',
          description: 'Portable policy artifact for compensation planning.',
        }
      );
    }

    return new PolicyPack({
      name: 'compensation-policy-planner',
      description: 'Portable policy artifact for compensation planning.',
    });
  }
}

module.exports = { CompensationPolicyPlanner };
