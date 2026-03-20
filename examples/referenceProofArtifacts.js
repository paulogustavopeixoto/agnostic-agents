const {
  AssuranceReport,
  AutonomyRolloutGuard,
  GovernanceRecordLedger,
  PolicyAutonomyAttestation,
  ReleaseEvidenceBundle,
  RoutePromotionProof,
} = require('../index');

async function main() {
  const assurance = new AssuranceReport({
    invariants: [
      { id: 'policy_gate', passed: true, surface: 'policy', severity: 'high' },
      { id: 'memory_governance', passed: true, surface: 'memory', severity: 'high' },
    ],
    scenarios: [
      { id: 'shadow_route', passed: true },
      { id: 'rollback_discipline', passed: true },
    ],
  });

  const governance = new GovernanceRecordLedger({
    records: [
      { surface: 'operator', type: 'approval', candidateId: 'candidate-v21', approver: 'ops' },
      { surface: 'operator', type: 'approval', candidateId: 'candidate-v21', approver: 'compliance' },
    ],
  });

  const routeProof = RoutePromotionProof.build({
    routeId: 'primary-support-route',
    shadowReport: {
      summary: {
        beforeSuccessRate: 0.91,
        afterSuccessRate: 0.96,
        beforeLatency: 1100,
        afterLatency: 980,
        beforeCost: 0.14,
        afterCost: 0.12,
      },
    },
    rollbackTarget: { routeId: 'primary-support-route-prev' },
    approvals: ['ops', 'routing-owner'],
    operator: 'ops',
  });

  const attestation = PolicyAutonomyAttestation.issue({
    candidateId: 'candidate-v21',
    policyPack: { id: 'policy-pack-7', name: 'production-policy', version: '7.0.0' },
    autonomyEnvelope: { id: 'envelope-3', budget: { spend: 25 }, threshold: 0.82 },
    jurisdictions: ['eu', 'us'],
    approvedBy: ['ops', 'compliance'],
  });

  const rolloutGuard = new AutonomyRolloutGuard().evaluate({
    adjustment: { action: 'widen', evidenceScore: 0.93 },
    benchmarkReport: { failed: 0 },
  });

  const evidenceBundle = ReleaseEvidenceBundle.build({
    candidateId: 'candidate-v21',
    assurance,
    benchmarkReport: { total: 6, passed: 6, failed: 0 },
    fleet: { canaryHealthy: true, rollbackReady: true },
    governance,
    rolloutGuard,
    routeProofs: [routeProof],
    attestations: [attestation],
  });

  console.log('Proof artifact summary:');
  console.dir(
    {
      routeProof,
      attestation,
      evidenceBundle,
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
