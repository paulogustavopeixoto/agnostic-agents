const {
  WorkflowOutcomeContract,
  OutcomeScorecard,
  GovernedOutcomeOptimizationLoop,
} = require('../index');

async function main() {
  const contract = new WorkflowOutcomeContract({
    id: 'support-resolution-contract',
    objective: 'Resolve support requests quickly without degrading policy compliance.',
    acceptanceCriteria: [
      { key: 'businessOutcomeMet', expected: true },
      { key: 'serviceOutcomeMet', expected: true },
      { key: 'overallScore', expected: value => value >= 80 },
    ],
    operatorReviewPoints: ['route_change', 'policy_change'],
    metrics: ['resolution_rate', 'sla_attainment'],
  });

  const scorecardInput = {
    runs: [{ status: 'completed' }, { status: 'completed' }],
    outcomes: {
      businessTarget: 0.9,
      businessActual: 0.94,
      serviceSla: 0.95,
      serviceActual: 0.97,
    },
  };

  const scorecard = new OutcomeScorecard().evaluate(scorecardInput);
  const optimizationReview = new GovernedOutcomeOptimizationLoop().review({
    contract,
    scorecardInput,
    proposalInput: {
      evalFindings: [
        {
          scenarioId: 'support-latency',
          passed: false,
          summary: 'Resolution latency could improve.',
          metrics: { averageConfidence: 0.7 },
        },
      ],
    },
  });

  console.log('Outcome contract summary:');
  console.dir(
    {
      contract: contract.toJSON(),
      scorecard,
      optimizationReview,
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
