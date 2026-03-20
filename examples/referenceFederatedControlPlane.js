const {
  ExternalControlPlaneCertificationKit,
  FederatedAuditStitcher,
  FederatedDelegationLedger,
  GovernanceRecordLedger,
  TrustCertificationExchange,
} = require('../index');

async function main() {
  const localLedger = new GovernanceRecordLedger({
    records: [
      {
        id: 'local-dashboard-approval',
        timestamp: '2026-03-20T11:00:00.000Z',
        surface: 'operator',
        action: 'approval',
        candidateId: 'candidate-v22-control-plane',
      },
    ],
  });

  const partnerLedger = new GovernanceRecordLedger({
    records: [
      {
        id: 'partner-runtime-review',
        timestamp: '2026-03-20T11:01:00.000Z',
        surface: 'policy',
        action: 'review',
        candidateId: 'candidate-v22-control-plane',
      },
    ],
  });

  const delegationLedger = new FederatedDelegationLedger({
    records: [
      {
        id: 'delegation-dashboard-runtime',
        timestamp: '2026-03-20T10:59:00.000Z',
        organizationId: 'hq-ops',
        delegateOrganizationId: 'partner-runtime-team',
        candidateId: 'candidate-v22-control-plane',
        jurisdictions: ['us'],
      },
    ],
  });

  const kit = new ExternalControlPlaneCertificationKit();
  const dashboardCertification = kit.certify({
    name: 'partner-dashboard',
    capabilities: ['runRead', 'incidentView', 'approvalState', 'traceDiff'],
  }, {
    type: 'dashboard',
  });
  const runtimeCertification = kit.certify({
    name: 'partner-runtime',
    capabilities: ['governanceWebhook', 'eventForwarding', 'runExport', 'approvalResolution'],
  }, {
    type: 'partner_runtime',
  });

  const exchange = TrustCertificationExchange.publish({
    source: 'hq-control-plane',
    certifications: [dashboardCertification, runtimeCertification],
    trustSignals: [
      { target: 'partner-dashboard', signal: 'triage_consistent', score: 0.91 },
      { target: 'partner-runtime', signal: 'runtime_export_stable', score: 0.94 },
    ],
  });

  const stitched = new FederatedAuditStitcher({
    ledgers: [
      { source: 'hq', ledger: localLedger },
      { source: 'partner-runtime', ledger: partnerLedger },
    ],
    delegationLedger,
  }).stitch({ candidateId: 'candidate-v22-control-plane' });

  console.log('Federated control-plane summary:');
  console.dir(
    {
      dashboardCertification,
      runtimeCertification,
      exchange,
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
