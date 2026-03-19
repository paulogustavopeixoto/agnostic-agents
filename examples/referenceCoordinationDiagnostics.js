const {
  CoordinationDiagnostics,
  CoordinationQualityTracker,
} = require('../index');

const diagnostics = new CoordinationDiagnostics();
const qualityTracker = new CoordinationQualityTracker();

qualityTracker.record({
  actorId: 'verifier-gamma',
  role: 'verifier',
  domain: 'release_review',
  taskFamily: 'release_review',
  success: false,
  confidence: 0.58,
});
qualityTracker.record({
  actorId: 'executor-beta',
  role: 'executor',
  domain: 'release_review',
  taskFamily: 'release_review',
  success: true,
  confidence: 0.82,
});

const report = diagnostics.summarize({
  review: {
    summary: {
      total: 2,
      disagreement: true,
    },
  },
  resolution: {
    action: 'escalate',
    disagreement: true,
  },
  plan: {
    strategy: 'escalate_missing_roles',
    gaps: ['aggregator'],
  },
  verification: {
    action: 'escalate',
    summary: {
      disagreement: true,
      action: 'escalate',
    },
  },
  quality: qualityTracker.summarize(),
});

console.log('Coordination diagnostics summary:');
console.dir(report, { depth: null });
