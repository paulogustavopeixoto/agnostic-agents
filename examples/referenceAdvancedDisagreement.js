const {
  CritiqueProtocol,
  TrustRegistry,
  DisagreementResolver,
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
        confidence: 0.97,
        outcomeType: 'direct',
      },
      {
        actorId: 'critic-grounding',
        domain: 'release_review',
        taskFamily: 'release_review',
        role: 'critic',
        success: true,
        confidence: 0.92,
        outcomeType: 'recovery',
        recoverySucceeded: true,
      },
      {
        actorId: 'critic-style',
        domain: 'release_review',
        taskFamily: 'release_review',
        role: 'critic',
        success: false,
        confidence: 0.45,
        outcomeType: 'retry',
        retries: 2,
      },
    ],
  });

  const protocol = new CritiqueProtocol({
    reviewers: [
      {
        id: 'verifier-release',
        review: async () => ({
          criticId: 'verifier-release',
          verdict: 'accept',
          failureType: 'general',
          severity: 'low',
          confidence: 0.86,
          recommendedAction: 'accept',
          rationale: 'Release evidence is sufficient.',
          metadata: {
            role: 'verifier',
            taskFamily: 'release_review',
          },
        }),
      },
      {
        id: 'critic-grounding',
        review: async () => ({
          criticId: 'critic-grounding',
          verdict: 'reject',
          failureType: 'grounding',
          severity: 'high',
          confidence: 0.88,
          recommendedAction: 'branch_and_retry',
          rationale: 'Grounding evidence conflicts with the release summary.',
          metadata: {
            role: 'critic',
            taskFamily: 'release_review',
          },
        }),
      },
      {
        id: 'critic-style',
        review: async () => ({
          criticId: 'critic-style',
          verdict: 'revise',
          failureType: 'format',
          severity: 'low',
          confidence: 0.52,
          recommendedAction: 'revise',
          rationale: 'The summary wording should be tightened.',
          metadata: {
            role: 'critic',
            taskFamily: 'release_review',
          },
        }),
      },
    ],
  });

  const review = await protocol.review(
    { id: 'advanced-disagreement-candidate', taskFamily: 'release_review' },
    { domain: 'release_review', taskFamily: 'release_review' }
  );

  const resolver = new DisagreementResolver({
    trustRegistry,
    strategy: 'trust_consensus',
    trustThreshold: 0.8,
  });
  const resolution = resolver.resolve(review.critiques, {
    domain: 'release_review',
    taskFamily: 'release_review',
  });

  console.log('Advanced disagreement summary:');
  console.dir(
    {
      trustProfile: trustRegistry.getProfile('critic-grounding'),
      trustSummary: trustRegistry.summarize(),
      resolution,
    },
    { depth: null }
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
