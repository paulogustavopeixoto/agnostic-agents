const {
  Run,
  RunInspector,
  CritiqueProtocol,
  CritiqueSchemaRegistry,
  TrustRegistry,
  DisagreementResolver,
  CoordinationLoop,
} = require('../index');

async function main() {
  const run = new Run({
    id: 'coordination-demo-run',
    input: 'Prepare a release recommendation',
    status: 'completed',
    output: 'Ship the release now.',
    state: {
      assessment: {
        confidence: 0.52,
        evidenceConflicts: 1,
        verification: {
          action: 'require_approval',
          reason: 'Conflicting evidence exists.',
        },
      },
      selfVerification: {
        action: 'require_approval',
        reason: 'Conflicting evidence exists.',
      },
    },
    pendingApproval: {
      reason: 'Release communication requires review.',
    },
  });

  const candidate = RunInspector.summarize(run);
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
        riskClasses: {
          high: {
            taxonomy: {
              grounding: {
                severity: 'critical',
                recommendedAction: 'escalate',
                requiredEvidence: ['incident_trace'],
              },
            },
          },
        },
        artifactTypes: {
          release_memo: {
            taxonomy: {
              policy: {
                requiredEvidence: ['operator_signoff'],
              },
            },
          },
        },
      },
    },
  });
  const protocol = new CritiqueProtocol({
    schemaRegistry,
    reviewers: [
      {
        id: 'critic-grounding',
        review: async summary => ({
          criticId: 'critic-grounding',
          verdict: summary.assessment?.evidenceConflicts > 0 ? 'reject' : 'accept',
          failureType: 'grounding',
          severity: 'high',
          confidence: 0.88,
          recommendedAction: 'branch_and_retry',
          rationale: 'Conflicting evidence means the release recommendation should be retried against a cleaner branch.',
          evidence: {
            evidenceConflicts: summary.assessment?.evidenceConflicts || 0,
          },
        }),
      },
      {
        id: 'critic-policy',
        review: async summary => ({
          criticId: 'critic-policy',
          verdict: summary.pendingApproval ? 'escalate' : 'accept',
          failureType: 'policy',
          severity: summary.pendingApproval ? 'critical' : 'low',
          confidence: 0.91,
          recommendedAction: summary.pendingApproval ? 'escalate' : 'accept',
          rationale: 'A recommendation that is already approval-gated should be escalated to an operator.',
          evidence: {
            pendingApproval: Boolean(summary.pendingApproval),
          },
        }),
      },
    ],
  });

  const trustRegistry = new TrustRegistry();
  trustRegistry.recordOutcome({
    actorId: 'critic-grounding',
    domain: 'grounding',
    success: true,
    confidence: 0.92,
  });
  trustRegistry.recordOutcome({
    actorId: 'critic-policy',
    domain: 'policy',
    success: true,
    confidence: 0.97,
  });

  const enrichedCandidate = {
    ...candidate,
    taskFamily: 'release_review',
    riskClass: 'high',
    artifactType: 'release_memo',
  };
  const enrichedContext = {
    domain: 'policy',
    taskFamily: 'release_review',
    riskClass: 'high',
    artifactType: 'release_memo',
  };

  const review = await protocol.review(enrichedCandidate, enrichedContext);
  const resolver = new DisagreementResolver({ trustRegistry });
  const resolution = resolver.resolve(review.critiques, enrichedContext);
  const loop = new CoordinationLoop({
    critiqueProtocol: protocol,
    trustRegistry,
    disagreementResolver: resolver,
    handlers: {
      escalate: async ({ candidate: reviewedCandidate, resolution: resolved }) => ({
        ok: true,
        escalated: true,
        candidateId: reviewedCandidate.id,
        reason: resolved.reason,
      }),
      branch_and_retry: async ({ candidate: reviewedCandidate }) => ({
        ok: true,
        branched: true,
        candidateId: reviewedCandidate.id,
      }),
    },
  });
  const loopRecord = await loop.coordinate(enrichedCandidate, enrichedContext);

  console.log('Structured critique review:');
  console.dir(review, { depth: null });

  console.log('\nTrust summary:');
  console.dir(trustRegistry.summarize(), { depth: null });

  console.log('\nResolved coordination action:');
  console.dir(resolution, { depth: null });

  console.log('\nCoordination loop record:');
  console.dir(loopRecord, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
