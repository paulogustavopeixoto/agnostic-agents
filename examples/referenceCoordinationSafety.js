const {
  TrustRegistry,
  RoleAwareCoordinationPlanner,
  DelegationBudget,
  SharedContextScope,
  CoordinationSafetyGuard,
} = require('../index');

const trustRegistry = new TrustRegistry({
  records: [
    { actorId: 'multi-role-alpha', domain: 'release_review', success: true, confidence: 0.92 },
    { actorId: 'planner-beta', domain: 'release_review', success: true, confidence: 0.88 },
    { actorId: 'aggregator-gamma', domain: 'release_review', success: true, confidence: 0.9 },
  ],
});

const safetyGuard = new CoordinationSafetyGuard({
  maxRepeatedActionCount: 2,
  delegationBudget: new DelegationBudget({
    maxTotalDelegations: 1,
    perActor: {
      'multi-role-alpha': 1,
    },
  }),
  sharedContextScope: new SharedContextScope({
    roleScopes: {
      planner: ['ticketId', 'releaseWindow'],
      executor: ['ticketId'],
      verifier: ['ticketId'],
      critic: ['ticketId'],
      aggregator: ['ticketId', 'releaseWindow'],
    },
  }),
});

const planner = new RoleAwareCoordinationPlanner({
  trustRegistry,
  safetyGuard,
});

const task = {
  id: 'safety-review-task',
  taskType: 'release_review',
  complexity: 0.9,
  risk: 0.82,
  suggestedSubtasks: [
    { id: 'subtask-1', task: 'review evidence', requiredCapabilities: ['retrieval'] },
    { id: 'subtask-2', task: 'draft recommendation', requiredCapabilities: ['generateText'] },
  ],
};

const actors = [
  {
    id: 'multi-role-alpha',
    roles: ['executor', 'verifier'],
    capabilities: ['execution', 'verification'],
    trustScore: 0.91,
  },
  {
    id: 'planner-beta',
    roles: ['planner'],
    capabilities: ['planning'],
    trustScore: 0.85,
  },
  {
    id: 'aggregator-gamma',
    roles: ['aggregator', 'critic'],
    capabilities: ['synthesis', 'critique'],
    trustScore: 0.87,
  },
];

const plan = planner.plan(task, {
  actors,
  context: {
    domain: 'release_review',
    sharedContext: {
      ticketId: 'REL-204',
      releaseWindow: '2026-03-21T10:00:00Z',
      secretToken: 'top-secret',
    },
    history: [
      { resolution: { action: 'branch_and_retry' } },
      { resolution: { action: 'branch_and_retry' } },
      { resolution: { action: 'branch_and_retry' } },
    ],
  },
});

console.log('Coordination safety summary');
console.dir(
  {
    strategy: plan.strategy,
    summary: plan.summary,
    assignments: plan.assignments.map(assignment => ({
      role: assignment.role,
      actorId: assignment.actor?.id || null,
    })),
    safety: plan.safety,
  },
  { depth: null }
);
