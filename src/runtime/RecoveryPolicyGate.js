const { PolicyPack } = require('./PolicyPack');
const { PolicyScopeResolver } = require('./PolicyScopeResolver');
const { PolicySimulator } = require('./PolicySimulator');
const { PolicyEvaluationRecord } = require('./PolicyEvaluationRecord');
const { PolicyDecisionReport } = require('./PolicyDecisionReport');
const { ToolPolicy } = require('./ToolPolicy');

class RecoveryPolicyGate {
  constructor({
    policyPack = null,
    toolPolicy = null,
    policyScopeResolver = null,
    scopes = null,
    defaultBlockedAction = 'require_recovery_approval',
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
    this.defaultBlockedAction = defaultBlockedAction;
    this.actionMetadata = { ...actionMetadata };
  }

  evaluateStep(step = {}, plan = {}, context = {}) {
    const request = this._buildRequest(step, plan, context);
    const policyDecision = this.simulator.simulateRequest(request.tool, request.args, request.context);

    return {
      step,
      policyDecision,
      allowed: policyDecision.action === 'allow',
      gatedAction: policyDecision.action === 'allow' ? step.action : this.defaultBlockedAction,
      reason:
        policyDecision.action === 'allow'
          ? step.reason || 'Recovery action allowed by policy.'
          : policyDecision.reason || 'Recovery action gated by policy.',
    };
  }

  evaluatePlan(plan = {}, context = {}) {
    const evaluations = (plan.steps || []).map(step => this.evaluateStep(step, plan, context));
    const blocked = evaluations.filter(item => !item.allowed);

    return {
      runId: plan.runId || null,
      incidentType: plan.incidentType || null,
      evaluations,
      blocked,
      summary: {
        total: evaluations.length,
        blocked: blocked.length,
        allowed: evaluations.length - blocked.length,
      },
      recommendedAction: blocked[0]?.gatedAction || plan.recommendedAction || null,
    };
  }

  createEvaluationRecord(plan = {}, context = {}) {
    const evaluation = this.evaluatePlan(plan, context);
    const decisions = evaluation.evaluations.map(item => item.policyDecision);
    const report = new PolicyDecisionReport({
      mode: 'recovery_policy_gate',
      policyPack: this.policyPack?.toJSON?.() || this.policyPack,
      decisions,
      metadata: {
        runId: plan.runId || null,
        incidentType: plan.incidentType || null,
        recommendedAction: evaluation.recommendedAction,
      },
    });

    return new PolicyEvaluationRecord({
      subject: {
        type: 'recovery_plan',
        runId: plan.runId || null,
        incidentType: plan.incidentType || null,
      },
      report: report.toJSON(),
      metadata: {
        blocked: evaluation.summary.blocked,
        recommendedAction: evaluation.recommendedAction,
      },
    });
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
          name: 'recovery-policy-gate',
          description: 'Portable policy artifact for recovery-policy gating.',
        }
      );
    }

    return new PolicyPack({
      name: 'recovery-policy-gate',
      description: 'Portable policy artifact for recovery-policy gating.',
    });
  }

  _buildRequest(step = {}, plan = {}, context = {}) {
    return {
      tool: {
        name: `recovery:${step.action || 'unknown'}`,
        metadata: {
          sideEffectLevel: step.requiresApproval ? 'external_write' : 'none',
          tags: [
            'recovery',
            step.action || 'unknown',
            ...(plan.incidentType ? [plan.incidentType] : []),
          ],
          ...this.actionMetadata[step.action],
        },
      },
      args: {
        runId: plan.runId || null,
        incidentType: plan.incidentType || null,
        priority: step.priority || null,
      },
      context: {
        ...context,
        stage: 'recovery',
        run: context.run || null,
      },
    };
  }
}

module.exports = { RecoveryPolicyGate };
