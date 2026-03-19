const {
  CoordinationQualityTracker,
} = require('../index');

const tracker = new CoordinationQualityTracker();

tracker.record({
  actorId: 'executor-beta',
  role: 'executor',
  domain: 'release_review',
  taskFamily: 'release_review',
  success: true,
  confidence: 0.81,
});
tracker.record({
  actorId: 'executor-beta',
  role: 'executor',
  domain: 'release_review',
  taskFamily: 'release_review',
  success: false,
  confidence: 0.42,
  retries: 2,
});
tracker.record({
  actorId: 'verifier-gamma',
  role: 'verifier',
  domain: 'release_review',
  taskFamily: 'release_review',
  success: true,
  confidence: 0.94,
});
tracker.record({
  actorId: 'verifier-gamma',
  role: 'verifier',
  domain: 'release_review',
  taskFamily: 'release_review',
  success: true,
  confidence: 0.91,
  recoverySucceeded: true,
});

console.log('Coordination quality summary:');
console.dir(
  {
    summary: tracker.summarize(),
    verifierProfile: tracker.getProfile('verifier-gamma'),
    executorProfile: tracker.getProfile('executor-beta'),
  },
  { depth: null }
);
