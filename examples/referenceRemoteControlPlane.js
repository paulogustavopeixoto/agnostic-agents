const {
  Agent,
  GovernanceHooks,
  InMemoryRunStore,
  EventBus,
  Tool,
  WebhookGovernanceAdapter,
  WebhookEventSink,
} = require('../index');

function createAdapter() {
  return {
    getCapabilities: () => ({ generateText: true, toolCalling: true }),
    generateText: async (messages, options = {}) => {
      const alreadyHasToolResult = messages.some(message => message?.role === 'function');
      if (options.tools?.length && !alreadyHasToolResult) {
        return {
          message: '',
          toolCalls: [
            {
              name: 'send_status_update',
              arguments: {
                recipient: 'Paulo',
                summary: 'Remote control plane integration validated.',
              },
              id: 'tool_use_remote_control',
            },
          ],
        };
      }

      return {
        message: 'Remote control plane integration validated.',
      };
    },
  };
}

async function main() {
  const governanceRequests = [];
  const eventRequests = [];
  const runStore = new InMemoryRunStore();

  const governanceAdapter = new WebhookGovernanceAdapter({
    endpoint: 'https://control-plane.example/governance',
    transport: async request => {
      governanceRequests.push(request);
      return { ok: true };
    },
  });

  const eventSink = new WebhookEventSink({
    endpoint: 'https://control-plane.example/events',
    eventTypes: ['run_completed', 'approval_requested'],
    transport: async request => {
      eventRequests.push(request);
      return { ok: true };
    },
  });

  const agent = new Agent(createAdapter(), {
    tools: [
      new Tool({
        name: 'send_status_update',
        parameters: {
          type: 'object',
          properties: {
            recipient: { type: 'string' },
            summary: { type: 'string' },
          },
          required: ['recipient', 'summary'],
        },
        metadata: {
          executionPolicy: 'require_approval',
          sideEffectLevel: 'external_write',
        },
        implementation: async ({ recipient, summary }) => ({
          delivered: true,
          recipient,
          summary,
        }),
      }),
    ],
    governanceHooks: new GovernanceHooks(governanceAdapter.asHooks()),
    eventBus: new EventBus({ sinks: [eventSink] }),
    runStore,
  });

  let run = await agent.run('Send the remote control plane status update.');
  console.log('Initial run status:');
  console.log(run.status);
  if (run.status === 'waiting_for_approval') {
    run = await agent.resumeRun(run.id, { approved: true, reason: 'approved by control plane' });
  }

  console.log('Governance requests:');
  console.dir(
    governanceRequests.map(request => ({
      url: request.url,
      type: request.body?.type || null,
    })),
    { depth: null }
  );

  console.log('\nEvent sink requests:');
  console.dir(
    eventRequests.map(request => ({
      url: request.url,
      eventType: request.body?.event?.type || null,
      runId: request.body?.run?.id || null,
    })),
    { depth: null }
  );

  console.log('\nRun status:');
  console.log(run.status);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
