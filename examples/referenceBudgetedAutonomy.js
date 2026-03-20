const {
  AutonomyBudget,
  AutonomyBudgetLedger,
  UncertaintySupervisionPolicy,
  ApprovalDelegationContract,
  AutonomyEnvelope,
} = require('../index');

async function main() {
  const budget = new AutonomyBudget({
    spend: 5,
    retries: 2,
    toolCalls: 3,
    wallClockMs: 1000,
    externalActions: 1,
    tokens: 1000,
  });
  const ledger = new AutonomyBudgetLedger();
  const supervisionPolicy = new UncertaintySupervisionPolicy({
    reviewThreshold: 0.7,
    escalateThreshold: 0.5,
  });
  const delegation = new ApprovalDelegationContract({
    id: 'ops-approval-contract',
    approver: 'ops-lead',
    delegate: 'oncall-operator',
    scope: [
      { action: 'send_status_update', environment: 'prod', tenant: 'acme' },
    ],
  });
  const envelope = new AutonomyEnvelope({
    budget,
    supervisionPolicy,
    environment: 'prod',
    tenant: 'acme',
  });

  const firstDecision = envelope.evaluate({
    usage: { toolCalls: 1, externalActions: 1, spend: 1.5, tokens: 250 },
    assessment: { confidence: 0.62 },
    riskClass: 'high',
  });
  ledger.record({
    runId: 'budgeted-run-1',
    action: firstDecision.action,
    snapshot: firstDecision.budget,
  });

  const secondDecision = envelope.evaluate({
    usage: { toolCalls: 3, spend: 4, tokens: 900 },
    assessment: { confidence: 0.9 },
    riskClass: 'medium',
  });
  ledger.record({
    runId: 'budgeted-run-1',
    action: secondDecision.action,
    snapshot: secondDecision.budget,
  });

  console.log('Budgeted autonomy summary');
  console.dir(
    {
      firstDecision,
      secondDecision,
      approvalDelegationApplies: delegation.appliesTo({
        action: 'send_status_update',
        environment: 'prod',
        tenant: 'acme',
      }),
      budgetLedger: ledger.summarize(),
    },
    { depth: null }
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
