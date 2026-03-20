const {
  EnterpriseAutonomyArchitecture,
  EnterpriseOperatingModel,
  UnifiedExecutionGraph,
  Run,
} = require('../index');

async function main() {
  const architecture = new EnterpriseAutonomyArchitecture({
    services: [
      { id: 'api-service', role: 'request_ingress', responsibilities: ['create_runs', 'collect_approvals'] },
      { id: 'worker-service', role: 'execution', responsibilities: ['continue_runs', 'execute_workflows'] },
      { id: 'control-plane', role: 'operator_surface', responsibilities: ['inspect_runs', 'triage_incidents'] },
    ],
    storage: [
      { id: 'run-store', type: 'durable_runs' },
      { id: 'job-store', type: 'durable_jobs' },
      { id: 'memory-store', type: 'governed_memory' },
    ],
    operators: [
      { id: 'ops-oncall', role: 'incident_response' },
      { id: 'risk-reviewer', role: 'approval' },
    ],
    environments: [
      { id: 'prod', tenants: ['acme'] },
      { id: 'staging', tenants: ['internal'] },
    ],
    metadata: {
      pattern: 'supervised_autonomy_reference',
    },
  }).build();

  const operatingModel = new EnterpriseOperatingModel().build({
    incident: {
      action: 'inspect_failed_run',
      summary: 'Runtime incident triggered by failed external status update.',
    },
    approvals: [
      { id: 'approval-1', action: 'send_status_update' },
    ],
    checkpoints: [
      { id: 'checkpoint-1', stepId: 'release_review' },
    ],
    recovery: {
      action: 'partial_replay',
      summary: 'Replay the failed delegated run from the last checkpoint.',
    },
    rollback: {
      action: 'rollback_rollout',
      summary: 'Rollback the canary because fleet regression signals increased.',
    },
    fleet: {
      action: 'halt_rollout',
      summary: 'Pause wider rollout until recovery and approvals complete.',
    },
  });

  const run = new Run({ id: 'enterprise-run-1', input: 'Handle a supervised release update.' });
  run.setStatus('completed');
  run.addStep({
    id: 'enterprise-run-1:step:1',
    type: 'workflow_step',
    status: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const unifiedGraph = new UnifiedExecutionGraph().build({
    run,
    policyDecisions: [{ id: 'policy:1', action: 'require_approval', toolName: 'send_status_update' }],
    coordination: { id: 'coordination:1', action: 'review' },
    learnedChanges: [{ id: 'learning:1', summary: 'Increase review depth', action: 'adjust_review' }],
    fleet: { id: 'fleet:1', action: 'halt_rollout', environment: 'prod' },
  });

  console.log('Enterprise autonomy architecture');
  console.dir(
    {
      architecture,
      operatingModel,
      unifiedGraph: unifiedGraph.summarize(),
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
