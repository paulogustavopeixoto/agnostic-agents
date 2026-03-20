const {
  TrustRegistry,
  VerificationStrategySelector,
  MultiPassVerificationEngine,
  CapabilityRouter,
} = require('../index');

async function main() {
  const trustRegistry = new TrustRegistry({
    records: [
      {
        actorId: 'verifier-release',
        domain: 'release_review',
        taskFamily: 'release_review',
        role: 'verifier',
        success: true,
        confidence: 0.93,
      },
      {
        actorId: 'critic-adversary',
        domain: 'release_review',
        taskFamily: 'release_review',
        role: 'critic',
        success: true,
        confidence: 0.9,
      },
      {
        actorId: 'aggregator-final',
        domain: 'release_review',
        taskFamily: 'release_review',
        role: 'aggregator',
        success: true,
        confidence: 0.91,
      },
    ],
  });

  const capabilityRouter = new CapabilityRouter({
    candidates: [
      {
        id: 'adversarial-sandbox',
        kind: 'simulator',
        capabilities: ['verification', 'critique'],
        profile: {
          taskTypes: ['release_review'],
          trustZones: ['private'],
          supportsSimulation: true,
          certificationLevel: 'certified',
          reputationScore: 0.83,
        },
      },
    ],
  });

  const selector = new VerificationStrategySelector({ trustRegistry, capabilityRouter });
  const engine = new MultiPassVerificationEngine({
    selector,
    reviewers: [
      {
        id: 'verifier-release',
        role: 'verifier',
        review: async () => ({
          verdict: 'accept',
          confidence: 0.84,
          rationale: 'Primary verification passed.',
        }),
      },
      {
        id: 'critic-adversary',
        role: 'critic',
        review: async () => ({
          verdict: 'reject',
          confidence: 0.87,
          rationale: 'Adversarial review found grounding conflicts.',
        }),
      },
      {
        id: 'aggregator-final',
        role: 'aggregator',
        review: async () => ({
          verdict: 'escalate',
          confidence: 0.9,
          rationale: 'Conflicting verification phases require operator escalation.',
        }),
      },
    ],
  });

  const result = await engine.verify(
    { id: 'coordination-verification-demo' },
    {
      task: {
        id: 'release-review-verification',
        taskFamily: 'release_review',
        risk: 0.86,
      },
      context: {
        domain: 'release_review',
        taskFamily: 'release_review',
        history: {
          failureRate: 0.18,
          disagreementRate: 0.42,
          evidenceConflicts: 1,
        },
        verifierActorIds: ['verifier-release'],
        trustZone: 'private',
        verificationCandidates: capabilityRouter.candidates,
      },
    }
  );

  console.log('Coordination verification summary:');
  console.dir(
    {
      strategy: result.strategy,
      selection: result.selection,
      routeTarget: result.selection.routeRecommendation?.candidate?.id || null,
      summary: result.summary,
      verificationTrace: result.verificationTrace,
    },
    { depth: null }
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
