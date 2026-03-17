const { EvalHarness } = require('./EvalHarness');
const { PolicySimulator } = require('./PolicySimulator');
const { CoordinationPolicyGate } = require('./CoordinationPolicyGate');

class ApprovalEscalationPolicySuite {
  constructor({
    policySimulator = null,
    coordinationPolicyGate = null,
    approvalScenarios = [],
    escalationScenarios = [],
  } = {}) {
    this.policySimulator = policySimulator instanceof PolicySimulator ? policySimulator : policySimulator || null;
    this.coordinationPolicyGate =
      coordinationPolicyGate instanceof CoordinationPolicyGate
        ? coordinationPolicyGate
        : coordinationPolicyGate || null;
    this.approvalScenarios = Array.isArray(approvalScenarios) ? [...approvalScenarios] : [];
    this.escalationScenarios = Array.isArray(escalationScenarios) ? [...escalationScenarios] : [];
  }

  buildScenarios() {
    const scenarios = [];

    if (this.policySimulator) {
      for (const scenario of this.approvalScenarios) {
        scenarios.push({
          id: scenario.id,
          run: async () =>
            this.policySimulator.simulateRequest(
              {
                name: scenario.toolName,
                metadata: scenario.metadata || {},
              },
              scenario.arguments || {},
              {
                stage: scenario.stage || 'pre_rollout_approval',
                ...(scenario.context || {}),
              }
            ),
          assert: decision =>
            (scenario.expectedAction ? decision.action === scenario.expectedAction : true) &&
            (scenario.expectedRuleId ? decision.ruleId === scenario.expectedRuleId : true),
        });
      }
    }

    if (this.coordinationPolicyGate) {
      for (const scenario of this.escalationScenarios) {
        scenarios.push({
          id: scenario.id,
          run: async () =>
            this.coordinationPolicyGate.evaluate(scenario.resolution || {}, {
              candidate: scenario.candidate || {},
              review: scenario.review || null,
              context: scenario.context || {},
            }),
          assert: evaluation =>
            (scenario.expectedPolicyAction ? evaluation.policyDecision.action === scenario.expectedPolicyAction : true) &&
            (scenario.expectedGatedAction ? evaluation.gatedAction === scenario.expectedGatedAction : true),
        });
      }
    }

    return scenarios;
  }

  async run() {
    const harness = new EvalHarness({
      scenarios: this.buildScenarios(),
    });

    return harness.run();
  }
}

module.exports = { ApprovalEscalationPolicySuite };
