const {
  CapabilityRouter,
  ReleaseEvidenceBundle,
  RoutePromotionProof,
  PolicyAutonomyAttestation,
  PreReleaseSimulationSuite,
  FailureInjectionSuite,
  ProofPromotionGate,
} = require('../index');

async function main() {
  const router = new CapabilityRouter({
    candidates: [
      {
        id: 'primary-model',
        kind: 'model',
        capabilities: ['summarization'],
        profile: {
          taskTypes: ['ops_summary'],
          costTier: 'medium',
          riskTier: 'low',
          latencyTier: 'medium',
          reputationScore: 0.9,
        },
      },
    ],
  });

  const simulationReport = await new PreReleaseSimulationSuite({ router }).run({
    routeScenarios: [
      {
        id: 'ops-summary',
        task: {
          taskType: 'ops_summary',
          requiredCapabilities: ['summarization'],
        },
      },
    ],
    memoryAudit: [
      { type: 'write', outcome: 'stored', key: 'customer:1', layer: 'episodic' },
      { type: 'read', outcome: 'returned', key: 'customer:1', layer: 'episodic' },
    ],
    stateBundle: {
      summary: {
        memoryContractSurfaces: ['runtime', 'workflow', 'coordination', 'learning', 'operator'],
      },
    },
    autonomy: {
      envelope: {
        budget: { spend: 5 },
      },
      approvalLatencyMs: 1000,
      escalation: { action: 'review', rationale: 'low confidence' },
    },
  });

  const failureInjectionReport = await new FailureInjectionSuite().run({
    worker: { recovered: true, checkpointed: true },
    fleet: { halted: true, rollbackReady: true },
    controlPlane: { auditPreserved: true, operatorFallback: true },
  });

  const evidenceBundle = ReleaseEvidenceBundle.build({
    candidateId: 'candidate-v21-rehearsed',
    assurance: {
      invariants: [{ id: 'policy_gate', passed: true }],
      scenarios: [{ id: 'shadow_route', passed: true }],
    },
    benchmarkReport: { total: 3, passed: 3, failed: 0 },
    governance: {
      records: [{ surface: 'operator', action: 'approval', candidateId: 'candidate-v21-rehearsed' }],
    },
    rolloutGuard: { action: 'allow_rollout' },
    routeProofs: [
      RoutePromotionProof.build({
        routeId: 'primary-route',
        shadowReport: {
          summary: {
            beforeSuccessRate: 0.91,
            afterSuccessRate: 0.95,
            beforeLatency: 1000,
            afterLatency: 930,
            beforeCost: 0.13,
            afterCost: 0.12,
          },
        },
        rollbackTarget: { routeId: 'primary-route-prev' },
        approvals: ['ops'],
      }),
    ],
    attestations: [
      PolicyAutonomyAttestation.issue({
        candidateId: 'candidate-v21-rehearsed',
        policyPack: { id: 'policy-pack-8', version: '8.0.0' },
        autonomyEnvelope: { id: 'envelope-4', budget: { spend: 10 } },
        approvedBy: ['ops'],
      }),
    ],
  });

  const promotionDecision = new ProofPromotionGate().evaluate({
    evidenceBundle,
    simulationReport,
    failureInjectionReport,
  });

  console.log('Proof rehearsal summary:');
  console.dir(
    {
      simulationReport,
      failureInjectionReport,
      promotionDecision,
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
