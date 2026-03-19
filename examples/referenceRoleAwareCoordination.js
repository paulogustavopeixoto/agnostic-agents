const {
  TrustRegistry,
  RoleAwareCoordinationPlanner,
  CoordinationTrace,
} = require('../index');

const trustRegistry = new TrustRegistry({
  records: [
    { actorId: 'planner-alpha', domain: 'release_review', success: true, confidence: 0.94 },
    { actorId: 'executor-beta', domain: 'release_review', success: true, confidence: 0.89 },
    { actorId: 'verifier-gamma', domain: 'release_review', success: true, confidence: 0.97 },
    { actorId: 'critic-delta', domain: 'release_review', success: true, confidence: 0.91 },
    { actorId: 'aggregator-epsilon', domain: 'release_review', success: true, confidence: 0.9 },
  ],
});

const planner = new RoleAwareCoordinationPlanner({ trustRegistry });

const task = {
  id: 'release-review-task',
  taskType: 'release_review',
  complexity: 0.88,
  risk: 0.82,
  requiredCapabilities: ['generateText', 'verification'],
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
};

const actors = [
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
];

const plan = planner.plan(task, {
  actors,
  context: {
    domain: 'release_review',
  },
});

console.log('Role-aware coordination plan:');
console.dir(
  {
    strategy: plan.strategy,
    summary: plan.summary,
    assignments: plan.assignments.map(assignment => ({
      role: assignment.role,
      actorId: assignment.actor?.id || null,
      trustScore: assignment.trustScore,
    })),
  },
  { depth: null }
);

console.log('Role-aware coordination trace:');
console.log(CoordinationTrace.render(plan.trace));
