const {
  PolicyPack,
  PolicyScopeResolver,
  PolicySimulator,
} = require('../index');

async function main() {
  const runtimePack = new PolicyPack({
    id: 'runtime-pack',
    name: 'runtime-guardrails',
    version: '1.0.0',
    description: 'Base runtime guardrails for all runs.',
    rules: [
      {
        id: 'runtime-require-approval',
        sideEffectLevels: ['external_write'],
        action: 'require_approval',
        reason: 'External writes require review at the runtime layer.',
      },
    ],
    allowTools: ['send_status_update', 'generate_report'],
    denyTools: ['delete_records'],
    metadata: {
      scope: 'runtime',
    },
  });

  const workflowPack = new PolicyPack({
    id: 'workflow-pack',
    name: 'workflow-customer-data',
    rules: [
      {
        id: 'workflow-require-sensitive-review',
        tags: ['sensitive'],
        action: 'require_approval',
        reason: 'Sensitive workflow steps require review.',
      },
    ],
    allowTools: ['send_status_update'],
    metadata: {
      scope: 'workflow',
    },
  });

  const agentPack = new PolicyPack({
    id: 'agent-pack',
    name: 'verifier-agent-guardrails',
    rules: [
      {
        id: 'agent-deny-bulk-export',
        toolNames: ['bulk_export'],
        action: 'deny',
        reason: 'Verifier agent cannot bulk export data.',
      },
    ],
    metadata: {
      scope: 'agent',
    },
  });

  const handoffPack = new PolicyPack({
    id: 'handoff-pack',
    name: 'remote-handoff-guardrails',
    version: '2.0.0',
    rules: [
      {
        id: 'handoff-deny-send-status',
        toolNames: ['send_status_update'],
        action: 'deny',
        reason: 'Remote handoff must not send status updates directly.',
      },
    ],
    metadata: {
      scope: 'handoff',
    },
  });

  const resolver = new PolicyScopeResolver();
  const resolved = resolver.resolve({
    runtime: runtimePack,
    workflow: workflowPack,
    agent: agentPack,
    distributedHandoff: handoffPack,
  });
  const simulator = new PolicySimulator({ policyPack: resolved });

  const decision = simulator.simulateRequest(
    {
      name: 'send_status_update',
      metadata: {
        sideEffectLevel: 'external_write',
        tags: ['sensitive'],
      },
    },
    {
      recipient: 'Paulo',
      summary: 'Remote worker finished its review.',
    },
    {
      stage: 'distributed_handoff',
    }
  );

  console.log('Resolved policy inheritance summary:');
  console.dir(
    {
      appliedScopes: resolved.metadata.appliedScopes,
      precedence: resolved.metadata.precedence,
      allowTools: resolved.allowTools,
      denyTools: resolved.denyTools,
      ruleOrder: resolved.rules.map(rule => `${rule.scope}:${rule.id}`),
    },
    { depth: null }
  );

  console.log('\nScoped policy decision:');
  console.dir(decision, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
