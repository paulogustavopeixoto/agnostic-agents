const {
  ConformanceKit,
  ExtensionManifest,
  InMemoryJobStore,
} = require('../index');

async function main() {
  const extension = {
    name: 'reference-interop-extension',
    version: '1.0.0',
    metadata: {
      certification: 'contract_verified',
    },
    contributes: {
      eventSinks: [
        {
          name: 'reference-event-sink',
          async handleEvent() {},
        },
      ],
      policyRules: [
        {
          id: 'reference-policy-rule',
          toolNames: ['send_status_update'],
          action: 'require_approval',
        },
      ],
      evalScenarios: [
        {
          id: 'reference-interop-scenario',
          run: async () => 'ok',
          assert: output => output === 'ok',
        },
      ],
    },
  };

  const manifest = ExtensionManifest.fromExtension(extension);
  const kit = new ConformanceKit();
  const extensionReport = kit.validateExtension(extension, { manifest });
  const jobStoreReport = kit.validateStore(new InMemoryJobStore(), { type: 'job' });

  console.log('Interop manifest summary:');
  console.dir(manifest.toJSON(), { depth: null });

  console.log('\nInterop conformance report:');
  console.dir(
    {
      extensionReport,
      jobStoreReport,
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
