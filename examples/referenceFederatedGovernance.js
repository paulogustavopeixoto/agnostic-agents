const {
  ApprovalDelegationContract,
  FederatedDelegationLedger,
  FederatedAuditStitcher,
  GovernanceRecordLedger,
} = require('../index');

async function main() {
  const localLedger = new GovernanceRecordLedger({
    records: [
      {
        id: 'local-1',
        timestamp: '2026-03-20T10:00:00.000Z',
        surface: 'operator',
        action: 'approval',
        candidateId: 'candidate-v22',
        actorId: 'ops-local',
      },
    ],
  });

  const partnerLedger = new GovernanceRecordLedger({
    records: [
      {
        id: 'partner-1',
        timestamp: '2026-03-20T10:01:00.000Z',
        surface: 'policy',
        action: 'review',
        candidateId: 'candidate-v22',
        actorId: 'partner-compliance',
      },
    ],
  });

  const delegationLedger = new FederatedDelegationLedger();
  delegationLedger.record({
    timestamp: '2026-03-20T09:59:00.000Z',
    type: 'approval_delegation',
    organizationId: 'local-org',
    delegateOrganizationId: 'partner-org',
    candidateId: 'candidate-v22',
    jurisdictions: ['eu'],
    environments: ['prod'],
    contract: new ApprovalDelegationContract({
      id: 'delegation-1',
      approver: 'ops-local',
      delegate: 'partner-compliance',
      scope: [{ action: 'promote_route', environment: 'prod' }],
    }),
  });

  const stitched = new FederatedAuditStitcher({
    ledgers: [
      { source: 'local', ledger: localLedger },
      { source: 'partner', ledger: partnerLedger },
    ],
    delegationLedger,
  }).stitch({ candidateId: 'candidate-v22' });

  console.log('Federated governance summary:');
  console.dir(
    {
      delegationSummary: delegationLedger.summarize(),
      stitched,
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
