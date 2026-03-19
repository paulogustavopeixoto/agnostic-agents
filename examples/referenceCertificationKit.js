const {
  CertificationKit,
  CompatibilitySummary,
  InMemoryJobStore,
} = require('../index');

async function main() {
  const kit = new CertificationKit();
  const providerResult = kit.certifyProvider({
    getCapabilities: () => ({
      generateText: true,
      toolCalling: true,
    }),
    supports: capability => capability === 'generateText' || capability === 'toolCalling',
    generateText: async () => ({ message: 'ok' }),
  }, {
    name: 'reference-provider',
  });
  const storeResult = kit.certifyStore(new InMemoryJobStore(), {
    type: 'job',
    name: 'reference-job-store',
  });
  const summary = CompatibilitySummary.build([providerResult, storeResult]);

  console.log('Certification kit summary:');
  console.dir(
    {
      providerResult,
      storeResult,
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
