const {
  DeploymentPatternCertificationKit,
  CompatibilitySummary,
} = require('../index');

async function main() {
  const kit = new DeploymentPatternCertificationKit();

  const apiWorkerControlPlane = kit.certifyPattern('api_worker_control_plane', {
    apiService: true,
    workerService: true,
    runStore: true,
    controlPlane: true,
    approvalInbox: true,
    governanceHooks: true,
    eventBus: true,
  });

  const supervisedAutonomyStack = kit.certifyPattern('supervised_autonomy_stack', {
    workflowRunner: true,
    policyPack: true,
    assuranceSuite: true,
    operatorWorkflow: true,
    fleetRollout: true,
    autonomyEnvelope: true,
    memoryGovernance: true,
  });

  const summary = CompatibilitySummary.build([
    {
      target: 'api-worker-control-plane',
      kind: 'deployment_pattern',
      level: apiWorkerControlPlane.level,
      valid: apiWorkerControlPlane.valid,
      errors: apiWorkerControlPlane.errors,
      warnings: apiWorkerControlPlane.warnings,
    },
    {
      target: 'supervised-autonomy-stack',
      kind: 'deployment_pattern',
      level: supervisedAutonomyStack.level,
      valid: supervisedAutonomyStack.valid,
      errors: supervisedAutonomyStack.errors,
      warnings: supervisedAutonomyStack.warnings,
    },
  ]);

  console.log('Deployment certification summary');
  console.dir(
    {
      apiWorkerControlPlane,
      supervisedAutonomyStack,
      summary,
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
