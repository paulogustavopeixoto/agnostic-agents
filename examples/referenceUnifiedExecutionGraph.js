const {
  Run,
  UnifiedExecutionGraph,
} = require('../index');

async function main() {
  const run = new Run({
    id: 'run-enterprise-1',
    input: 'Review the production release path and status update.',
  });
  run.setStatus('completed');
  run.addStep({
    id: 'run-enterprise-1:step:1',
    type: 'tool',
    status: 'completed',
    output: { delivered: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const graph = new UnifiedExecutionGraph().build({
    run,
    policyDecisions: [
      {
        id: 'policy:approval',
        action: 'require_approval',
        toolName: 'send_status_update',
      },
    ],
    memoryAudit: [
      {
        id: 'memory:write:1',
        type: 'memory_write',
        key: 'release_summary',
        layer: 'episodic',
      },
    ],
    coordination: {
      id: 'coordination:1',
      action: 'review',
    },
    learnedChanges: [
      {
        id: 'learning:1',
        summary: 'Increase release-review verification depth',
        action: 'adjust_verification',
      },
    ],
    fleet: {
      id: 'fleet:prod',
      action: 'allow_rollout',
      environment: 'prod',
    },
  });

  console.log('Unified execution graph summary');
  console.dir(
    {
      summary: graph.summarize(),
      nodes: graph.nodes,
      edges: graph.edges,
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
