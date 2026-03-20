const { CapabilityRouter, HistoricalRoutingAdvisor } = require('..');

async function main() {
  const advisor = new HistoricalRoutingAdvisor({
    outcomes: [
      { providerLabel: 'code-model', success: true, methodName: 'generateText', taskType: 'coding', confidence: 0.92 },
      { providerLabel: 'code-model', success: true, methodName: 'generateText', taskType: 'coding', confidence: 0.89 },
      { providerLabel: 'human-review', success: true, methodName: 'generateText', taskType: 'release_review', confidence: 0.97 },
      { providerLabel: 'cheap-extractor', success: false, methodName: 'generateText', taskType: 'coding' },
    ],
  });

  const router = new CapabilityRouter({
    routingAdvisor: advisor,
    candidates: [
      {
        id: 'code-model',
        kind: 'model',
        capabilities: ['generateText', 'toolCalling', 'code_generation'],
        profile: {
          taskTypes: ['coding', 'analysis'],
          trustZones: ['private', 'sandbox_only'],
          costTier: 'medium',
          riskTier: 'high',
          latencyTier: 'medium',
          certificationLevel: 'certified',
          reputationScore: 0.88,
        },
      },
      {
        id: 'cheap-extractor',
        kind: 'model',
        capabilities: ['generateText', 'extraction'],
        profile: {
          taskTypes: ['extraction', 'summarization'],
          trustZones: ['private'],
          costTier: 'low',
          riskTier: 'medium',
          latencyTier: 'low',
          certificationLevel: 'supported',
          reputationScore: 0.42,
        },
      },
      {
        id: 'sandbox-worker',
        kind: 'simulator',
        capabilities: ['simulation', 'tool_sandbox'],
        profile: {
          taskTypes: ['verification', 'risky_execution'],
          trustZones: ['sandbox_only'],
          costTier: 'medium',
          riskTier: 'high',
          latencyTier: 'medium',
          supportsSimulation: true,
          certificationLevel: 'certified',
          reputationScore: 0.79,
        },
      },
      {
        id: 'human-review',
        kind: 'human',
        capabilities: ['approval', 'release_signoff', 'policy_exception_review'],
        profile: {
          taskTypes: ['release_review', 'high_risk_approval'],
          trustZones: ['private'],
          costTier: 'high',
          riskTier: 'high',
          latencyTier: 'high',
          certificationLevel: 'trusted',
          reputationScore: 0.95,
        },
      },
    ],
  });

  const codingRoute = router.select({
    taskType: 'coding',
    requiredCapabilities: ['generateText'],
    preferredCapabilities: ['code_generation', 'toolCalling'],
    preferredKinds: ['model'],
    trustZone: 'private',
    route: { hints: { risk: 'high', cost: 'medium' } },
  });

  const riskyRoute = router.select({
    taskType: 'risky_execution',
    requiredCapabilities: ['simulation'],
    preferredKinds: ['simulator'],
    trustZone: 'sandbox_only',
    requiresSimulation: true,
  });

  console.log('Capability route for coding task:');
  console.dir(
    {
      selected: codingRoute.candidate,
      explanation: codingRoute.explanation,
      ranked: codingRoute.rankedCandidates.map(item => ({
        id: item.id,
        kind: item.kind,
        score: item.score,
        eligible: item.eligible,
      })),
    },
    { depth: null }
  );

  console.log('\nCapability route for risky action:');
  console.dir(
    {
      selected: riskyRoute.candidate,
      explanation: riskyRoute.explanation,
      rejected: riskyRoute.rejectedCandidates.map(item => ({
        id: item.id,
        reasons: item.reasons.map(reason => reason.message),
      })),
    },
    { depth: null }
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
