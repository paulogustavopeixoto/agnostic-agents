const {
  ApprovalEscalationPolicySuite,
  CoordinationPolicyGate,
  PolicyPack,
  PolicySimulator,
  ProductionPolicyPack,
} = require('../index');

async function main() {
  const productionPack = new ProductionPolicyPack({
    environment: 'staging',
    protectedToolNames: ['send_status_update'],
    denySideEffectLevels: ['destructive'],
  }).toPolicyPack();

  const simulator = new PolicySimulator({
    policyPack: productionPack,
  });

  const coordinationGate = new CoordinationPolicyGate({
    scopes: {
      runtime: new PolicyPack({
        id: 'runtime-policy-pack',
        name: 'runtime-policy-pack',
        rules: [
          {
            id: 'require-review-for-branch-retry',
            toolNames: ['coordination:branch_and_retry'],
            action: 'require_approval',
            reason: 'Branch-and-retry must be reviewed before execution.',
          },
        ],
      }),
      agent: new PolicyPack({
        id: 'coordination-policy-pack',
        name: 'coordination-policy-pack',
        rules: [
          {
            id: 'deny-policy-retries',
            toolNames: ['coordination:branch_and_retry'],
            tags: ['policy'],
            action: 'deny',
            reason: 'Policy failures must escalate instead of branching automatically.',
          },
        ],
      }),
    },
  });

  const suite = new ApprovalEscalationPolicySuite({
    policySimulator: simulator,
    coordinationPolicyGate: coordinationGate,
    approvalScenarios: [
      {
        id: 'approval-protected-tool',
        toolName: 'send_status_update',
        metadata: {
          sideEffectLevel: 'external_write',
        },
        arguments: {
          recipient: 'Paulo',
        },
        expectedAction: 'require_approval',
        expectedRuleId: 'staging-protected-tools',
      },
    ],
    escalationScenarios: [
      {
        id: 'escalate-policy-branch-retry',
        resolution: {
          action: 'branch_and_retry',
          rankedCritiques: [
            {
              failureType: 'policy',
              severity: 'high',
            },
          ],
        },
        context: {
          taskFamily: 'release_review',
        },
        expectedPolicyAction: 'deny',
        expectedGatedAction: 'escalate',
      },
    ],
  });

  const report = await suite.run();

  console.log('Approval and escalation policy suite report:');
  console.dir(report, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
