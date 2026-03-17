const {
  CoordinationPolicyGate,
  PolicyPack,
} = require('../index');

async function main() {
  const runtimePack = new PolicyPack({
    id: 'runtime-policy-pack',
    name: 'runtime-policy-pack',
    rules: [
      {
        id: 'require-review-for-branch-retry',
        toolNames: ['coordination:branch_and_retry'],
        action: 'require_approval',
        reason: 'Branch-and-retry must be reviewed before execution.',
      },
    ],
    metadata: {
      scope: 'runtime',
    },
  });

  const coordinationPack = new PolicyPack({
    id: 'coordination-policy-pack',
    name: 'coordination-policy-pack',
    version: '1.0.0',
    rules: [
      {
        id: 'deny-policy-retries',
        toolNames: ['coordination:branch_and_retry'],
        tags: ['policy'],
        action: 'deny',
        reason: 'Policy failures must escalate instead of branching automatically.',
      },
    ],
    metadata: {
      scope: 'agent',
    },
  });

  const gate = new CoordinationPolicyGate({
    scopes: {
      runtime: runtimePack,
      agent: coordinationPack,
    },
  });

  const resolution = {
    action: 'branch_and_retry',
    disagreement: false,
    reason: 'Recoverable issue suggests retrying from a clean branch.',
    rankedCritiques: [
      {
        criticId: 'critic-policy',
        failureType: 'policy',
        severity: 'high',
      },
    ],
  };

  const review = {
    summary: {
      total: 1,
      highestSeverity: 'high',
    },
  };

  const evaluation = gate.evaluate(resolution, {
    candidate: {
      id: 'coordination-candidate-1',
    },
    review,
    context: {
      taskFamily: 'release_review',
    },
  });

  const record = gate.createEvaluationRecord(resolution, {
    candidate: {
      id: 'coordination-candidate-1',
    },
    review,
    context: {
      taskFamily: 'release_review',
    },
  });

  console.log('Coordination policy gate summary:');
  console.dir(
    {
      resolvedPolicyPack: gate.policyPack.name,
      policyAction: evaluation.policyDecision.action,
      requestedAction: evaluation.action,
      gatedAction: evaluation.gatedAction,
      ruleId: evaluation.policyDecision.ruleId,
    },
    { depth: null }
  );

  console.log('\nCoordination policy evaluation artifact:');
  console.dir(record.summarize(), { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
