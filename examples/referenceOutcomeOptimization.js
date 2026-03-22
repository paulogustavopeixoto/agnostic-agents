const {
  WorkflowOutcomeContract,
  TradeoffAnalyzer,
  OutcomeOptimizationExperiment,
  OutcomeReviewWorkflow,
} = require('../index');

async function main() {
  const contract = new WorkflowOutcomeContract({
    id: 'support-optimization-contract',
    objective: 'Improve support resolution without reducing safety or SLA attainment.',
    acceptanceCriteria: [
      { key: 'businessOutcomeMet', expected: true },
      { key: 'serviceOutcomeMet', expected: true },
      { key: 'overallScore', expected: value => value >= 0 },
    ],
    operatorReviewPoints: ['optimization_promotion'],
  });

  const tradeoff = new TradeoffAnalyzer().evaluate({
    baseline: {
      cost: 0.14,
      latency: 1100,
      safety: 0.95,
      business: 0.89,
    },
    candidate: {
      cost: 0.12,
      latency: 980,
      safety: 0.95,
      business: 0.94,
    },
    priorities: {
      safety: 3,
      business: 2,
      latency: 1,
      cost: 1,
    },
  });

  const experiment = OutcomeOptimizationExperiment.build({
    id: 'support-optimization-experiment',
    baseline: {
      business: 0.89,
      service: 0.94,
      safety: 0.95,
    },
    candidate: {
      business: 0.94,
      service: 0.97,
      safety: 0.95,
    },
    thresholds: {
      minBusinessDelta: 0.02,
      minServiceDelta: 0.01,
      maxSafetyRegression: 0,
    },
  });

  const review = new OutcomeReviewWorkflow().review({
    contract,
    experiment,
    tradeoff,
  });

  console.log('Outcome optimization summary:');
  console.dir(
    {
      tradeoff,
      experiment,
      review,
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
