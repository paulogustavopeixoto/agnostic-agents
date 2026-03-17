const {
  CritiqueProtocol,
  CritiqueSchemaRegistry,
  TrustRegistry,
  DisagreementResolver,
  CoordinationLoop,
  DecompositionAdvisor,
  CoordinationBenchmarkSuite,
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
  const benchmarkSuite = new CoordinationBenchmarkSuite({
    critiqueProtocol,
    disagreementResolver,
    coordinationLoop,
    decompositionAdvisor,
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
