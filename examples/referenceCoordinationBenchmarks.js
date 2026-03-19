const {
  CritiqueProtocol,
  CritiqueSchemaRegistry,
  TrustRegistry,
  DisagreementResolver,
  CoordinationLoop,
  DecompositionAdvisor,
  CoordinationBenchmarkSuite,
  RoleAwareCoordinationPlanner,
} = require('../index');

async function main() {
  const schemaRegistry = new CritiqueSchemaRegistry({
    schemas: {
      release_review: {
        taxonomy: {
          grounding: {
            severity: 'high',
            verdict: 'reject',
            recommendedAction: 'branch_and_retry',
            requiredEvidence: ['citations'],
          },
          policy: {
            severity: 'critical',
            verdict: 'escalate',
            recommendedAction: 'escalate',
            requiredEvidence: ['approval_record'],
          },
        },
      },
    },
  });

  const trustRegistry = new TrustRegistry();
  trustRegistry.recordOutcome({
    actorId: 'policy-reviewer',
    domain: 'policy',
    success: true,
    confidence: 0.96,
  });

  const critiqueProtocol = new CritiqueProtocol({
    schemaRegistry,
    reviewers: [
      {
        id: 'policy-reviewer',
        review: async () => ({
          criticId: 'policy-reviewer',
          failureType: 'policy',
          confidence: 0.94,
          rationale: 'Operator approval is required before the release recommendation is used.',
        }),
      },
    ],
  });

  const disagreementResolver = new DisagreementResolver({ trustRegistry });
  const coordinationLoop = new CoordinationLoop({
    critiqueProtocol,
    trustRegistry,
    disagreementResolver,
    handlers: {
      escalate: async ({ candidate, resolution }) => ({
        ok: true,
        escalated: true,
        candidateId: candidate.id,
        reason: resolution.reason,
      }),
    },
  });

  const decompositionAdvisor = new DecompositionAdvisor();
  const roleAwareCoordinationPlanner = new RoleAwareCoordinationPlanner({ trustRegistry });
  const benchmarkSuite = new CoordinationBenchmarkSuite({
    critiqueProtocol,
    disagreementResolver,
    coordinationLoop,
    decompositionAdvisor,
    roleAwareCoordinationPlanner,
  });

  const report = await benchmarkSuite.run({
    candidate: {
      id: 'coordination-benchmark-candidate',
      taskFamily: 'release_review',
    },
    reviewContext: {
      taskFamily: 'release_review',
      domain: 'policy',
    },
    expectedResolutionAction: 'escalate',
    disagreementCritiques: [
      {
        criticId: 'policy-reviewer',
        verdict: 'escalate',
        failureType: 'policy',
        severity: 'critical',
        confidence: 0.94,
        recommendedAction: 'escalate',
      },
      {
        criticId: 'style-reviewer',
        verdict: 'revise',
        failureType: 'format',
        severity: 'low',
        confidence: 0.42,
        recommendedAction: 'revise',
      },
    ],
    expectedDisagreementAction: 'escalate',
    recoveryCandidate: {
      id: 'coordination-recovery-candidate',
      taskFamily: 'release_review',
    },
    recoveryContext: {
      taskFamily: 'release_review',
      domain: 'grounding',
    },
    expectedRecoveryAction: 'escalate',
    decompositionTask: {
      id: 'coordination-benchmark-task',
      task: 'Investigate release health and prepare executive summary',
      taskType: 'analysis',
      complexity: 0.91,
      risk: 0.4,
      requiredCapabilities: ['generateText', 'retrieval'],
      suggestedSubtasks: [
        {
          task: 'Investigate release health',
          taskType: 'analysis',
          requiredCapabilities: ['retrieval'],
        },
        {
          task: 'Prepare executive summary',
          taskType: 'writing',
          requiredCapabilities: ['generateText'],
        },
      ],
    },
    decompositionOptions: {
      availableDelegates: [
        {
          id: 'researcher',
          capabilities: ['retrieval'],
          specializations: ['analysis'],
          trustScore: 0.88,
        },
        {
          id: 'writer',
          capabilities: ['generateText'],
          specializations: ['writing'],
          trustScore: 0.91,
        },
      ],
    },
    expectedDecompositionAction: 'split_and_delegate',
    roleTask: {
      id: 'coordination-role-task',
      taskType: 'release_review',
      complexity: 0.88,
      risk: 0.82,
      suggestedSubtasks: [
        {
          task: 'Inspect release evidence',
          taskType: 'analysis',
          requiredCapabilities: ['retrieval'],
        },
        {
          task: 'Draft release recommendation',
          taskType: 'writing',
          requiredCapabilities: ['generateText'],
        },
      ],
    },
    roleActors: [
      {
        id: 'planner-alpha',
        roles: ['planner'],
        capabilities: ['planning', 'retrieval'],
        specializations: ['analysis'],
        trustScore: 0.92,
      },
      {
        id: 'executor-beta',
        roles: ['executor'],
        capabilities: ['execution', 'generateText'],
        specializations: ['writing'],
        trustScore: 0.87,
      },
      {
        id: 'verifier-gamma',
        roles: ['verifier'],
        capabilities: ['verification', 'retrieval'],
        specializations: ['review'],
        trustScore: 0.95,
      },
      {
        id: 'critic-delta',
        roles: ['critic'],
        capabilities: ['critique', 'verification'],
        specializations: ['review'],
        trustScore: 0.9,
      },
      {
        id: 'aggregator-epsilon',
        roles: ['aggregator'],
        capabilities: ['synthesis', 'generateText'],
        specializations: ['synthesis'],
        trustScore: 0.89,
      },
    ],
    roleContext: {
      domain: 'release_review',
    },
    expectedRoleStrategy: 'role_routed_split_execution',
    failureDecompositionTask: {
      id: 'coordination-failure-task',
      task: 'Execute risky production change without a verifier',
      taskType: 'operations',
      complexity: 0.93,
      risk: 0.95,
      requiredCapabilities: ['shell'],
    },
    failureDecompositionOptions: {
      availableDelegates: [],
    },
    expectedFailureDecompositionAction: 'escalate',
    trustSensitiveCritiques: [
      {
        criticId: 'policy-reviewer',
        verdict: 'escalate',
        failureType: 'policy',
        severity: 'critical',
        confidence: 0.94,
        recommendedAction: 'escalate',
        metadata: { role: 'critic', taskFamily: 'release_review' },
      },
      {
        criticId: 'style-reviewer',
        verdict: 'accept',
        failureType: 'general',
        severity: 'low',
        confidence: 0.35,
        recommendedAction: 'accept',
        metadata: { role: 'critic', taskFamily: 'release_review' },
      },
    ],
    expectedTrustAction: 'escalate',
  });

  console.log('Coordination benchmark report:');
  console.dir(report, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
