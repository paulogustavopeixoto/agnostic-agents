const {
  CertificationKit,
  DeploymentPatternCertificationKit,
  CompatibilitySummary,
  InMemoryRunStore,
  InMemoryJobStore,
} = require('../index');

async function main() {
  const kit = new DeploymentPatternCertificationKit({
    certificationKit: new CertificationKit(),
  });

  const results = kit.certifyMany([
    {
      pattern: 'supervised_autonomy_stack',
      name: 'reference-supervised-stack',
      deployment: {
        services: ['runtime', 'policy', 'operator', 'assurance', 'fleet'],
        capabilities: ['approvalWorkflows', 'humanReview', 'rollback', 'memoryGovernance'],
        environmentScopes: ['staging', 'prod'],
        approvalOrganizations: ['ops'],
        stores: {
          run: new InMemoryRunStore(),
          job: new InMemoryJobStore(),
        },
        providers: [
          {
            name: 'reference-provider',
            adapter: {
              getCapabilities: () => ({
                generateText: true,
                toolCalling: true,
              }),
              supports: capability => capability === 'generateText' || capability === 'toolCalling',
              generateText: async () => ({ message: 'ok' }),
            },
          },
        ],
      },
    },
    {
      pattern: 'public_control_plane',
      name: 'reference-public-control-plane',
      deployment: {
        services: ['control_plane', 'operator', 'policy', 'assurance'],
        capabilities: ['auditExport', 'tenantIsolation', 'approvalWorkflows', 'routeDiagnostics'],
        environmentScopes: ['prod'],
        approvalOrganizations: ['ops', 'compliance'],
        tenantBoundaries: ['tenant_id'],
        stores: {
          run: new InMemoryRunStore(),
        },
      },
    },
  ]);

  const summary = CompatibilitySummary.build(results);

  console.log('Deployment pattern certification summary:');
  console.dir(
    {
      results,
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
