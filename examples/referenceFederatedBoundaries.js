const {
  CertificationKit,
  DeploymentPatternCertificationKit,
  FleetRollbackAdvisor,
  FederatedPromotionBoundaryAdvisor,
  TrustCertificationExchange,
} = require('../index');

async function main() {
  const certification = new DeploymentPatternCertificationKit({
    certificationKit: new CertificationKit(),
  }).certify({
    name: 'partner-public-control-plane',
    services: ['control_plane', 'operator', 'policy'],
    capabilities: ['auditExport', 'tenantIsolation', 'approvalWorkflows'],
    environmentScopes: ['prod'],
    approvalOrganizations: ['ops', 'compliance'],
    tenantBoundaries: ['tenant_id'],
    stores: {
      run: {
        getRun: async () => null,
        saveRun: async () => {},
        listRuns: async () => [],
        updateRun: async () => {},
      },
    },
  }, {
    pattern: 'public_control_plane',
  });

  const rollback = new FleetRollbackAdvisor().advise({
    plan: {
      target: { id: 'eu-prod', version: '2026.03.20' },
    },
    comparison: {
      impact: { regressed: false },
      delta: { failedRuns: 0, adaptiveRegressions: 0, schedulerBacklog: 0 },
    },
    safetyDecision: { action: 'continue' },
  });

  const boundaryDecision = new FederatedPromotionBoundaryAdvisor().evaluate({
    candidateId: 'candidate-v22-boundary',
    targetRegion: 'eu-west',
    targetJurisdiction: 'eu',
    fleetRollback: rollback,
    boundaries: [
      { id: 'eu-prod-boundary', region: 'eu-west', jurisdiction: 'eu', promotion: 'allow' },
    ],
  });

  const exchange = TrustCertificationExchange.publish({
    source: 'partner-control-plane',
    certifications: [
      {
        target: certification.target,
        kind: certification.kind,
        level: certification.level,
        valid: certification.valid,
      },
    ],
    trustSignals: [
      {
        target: 'partner-control-plane',
        signal: 'operator_review_consistent',
        score: 0.93,
      },
    ],
  });

  console.log('Federated boundary summary:');
  console.dir(
    {
      boundaryDecision,
      exchange,
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
