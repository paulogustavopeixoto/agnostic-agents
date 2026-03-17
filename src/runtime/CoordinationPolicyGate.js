const { PolicyPack } = require('./PolicyPack');
const { PolicyScopeResolver } = require('./PolicyScopeResolver');
const { PolicySimulator } = require('./PolicySimulator');
const { PolicyEvaluationRecord } = require('./PolicyEvaluationRecord');
const { PolicyDecisionReport } = require('./PolicyDecisionReport');
const { ToolPolicy } = require('./ToolPolicy');

class CoordinationPolicyGate {
  constructor({
    policyPack = null,
    toolPolicy = null,
    policyScopeResolver = null,
    scopes = null,
    escalationAction = 'escalate',
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
    this.escalationAction = escalationAction;
    this.actionMetadata = { ...actionMetadata };
  }

  evaluate(resolution = {}, { candidate = {}, review = null, context = {} } = {}) {
    const action = resolution.action || 'accept';
    const strongestCritique = resolution.rankedCritiques?.[0] || null;
    const request = this._buildRequest(action, strongestCritique, context);
    const args = {
      candidateId: candidate.id || context.candidateId || null,
      critiqueCount: review?.summary?.total || review?.critiques?.length || 0,
      disagreement: Boolean(resolution.disagreement),
      highestSeverity: review?.summary?.highestSeverity || strongestCritique?.severity || null,
    };
    const policyDecision = this.simulator.simulateRequest(request.tool, args, request.context);

    return {
      action,
      policyDecision,
      allowed: policyDecision.action === 'allow',
      gatedAction: policyDecision.action === 'allow' ? action : this.escalationAction,
      reason:
        policyDecision.action === 'allow'
          ? resolution.reason || 'Coordination action allowed by policy.'
          : policyDecision.reason || 'Coordination action gated by policy.',
      request,
    };
  }

  createEvaluationRecord(resolution = {}, options = {}) {
    const evaluation = this.evaluate(resolution, options);
    const report = new PolicyDecisionReport({
      mode: 'coordination_policy_gate',
      policyPack: this.policyPack?.toJSON?.() || this.policyPack,
      decisions: [evaluation.policyDecision],
      metadata: {
        gatedAction: evaluation.gatedAction,
      },
    });

    return new PolicyEvaluationRecord({
      subject: {
        type: 'coordination_resolution',
        action: evaluation.action,
        candidateId: options.candidate?.id || options.context?.candidateId || null,
      },
      report: report.toJSON(),
      metadata: {
        policyAction: evaluation.policyDecision.action,
        gatedAction: evaluation.gatedAction,
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
          name: 'coordination-policy-gate',
          description: 'Portable policy artifact for coordination policy gating.',
        }
      );
    }

    return new PolicyPack({
      name: 'coordination-policy-gate',
      description: 'Portable policy artifact for coordination policy gating.',
    });
  }

  _buildRequest(action, strongestCritique, context = {}) {
    return {
      tool: {
        name: `coordination:${action}`,
        metadata: {
          sideEffectLevel: 'none',
          tags: [
            'coordination',
            action,
            ...(strongestCritique?.failureType ? [strongestCritique.failureType] : []),
            ...(context.taskFamily ? [context.taskFamily] : []),
          ],
          ...this.actionMetadata[action],
        },
      },
      context: {
        ...context,
        stage: 'coordination',
        run: context.run || null,
      },
    };
  }
}

module.exports = { CoordinationPolicyGate };
