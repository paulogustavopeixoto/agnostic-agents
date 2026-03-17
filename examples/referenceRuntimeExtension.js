const {
  EventBus,
  EvalHarness,
  ExtensionHost,
  Tool,
} = require('../index');

async function main() {
  const observedEvents = [];

  const extension = {
    name: 'reference-runtime-extension',
    version: '1.0.0',
    contributes: {
      eventSinks: [
        {
          async handleEvent(event) {
            observedEvents.push(event.type);
          },
        },
      ],
      policyRules: [
        {
          id: 'reference-require-approval',
          toolNames: ['send_status_update'],
          action: 'require_approval',
          reason: 'Reference extension requires approval for outbound updates.',
        },
      ],
      evalScenarios: [
        {
          id: 'reference-extension-scenario',
          run: async () => 'extension-ok',
          assert: output => output === 'extension-ok',
        },
      ],
    },
  };

  const host = new ExtensionHost({ extensions: [extension] });
  const policy = host.extendToolPolicy();
  const eventBus = host.extendEventBus(new EventBus());
  const harness = new EvalHarness({
    scenarios: host.getEvalScenarios(),
  });

  const decision = policy.evaluate(
    new Tool({
      name: 'send_status_update',
      parameters: { type: 'object', properties: {} },
      implementation: async () => ({ ok: true }),
    }),
    {},
    {}
  );

  await eventBus.emit({ type: 'reference_event' }, null);
  const report = await harness.run();

  console.log('Runtime extension summary:');
  console.dir(
    {
      extensions: host.listExtensions(),
      decision,
      observedEvents,
      report,
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
