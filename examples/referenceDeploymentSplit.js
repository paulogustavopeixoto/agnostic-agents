const {
  Agent,
  ApprovalInbox,
  EventBus,
  GovernanceHooks,
  InMemoryRunStore,
  RunInspector,
  Tool,
  WebhookEventSink,
  WebhookGovernanceAdapter,
} = require('../index');

function createAdapter(label) {
  return {
    getCapabilities: () => ({ generateText: true, toolCalling: true }),
    generateText: async (messages, options = {}) => {
      const alreadyHasToolResult = messages.some(message => message?.role === 'tool');
      if (options.tools?.length && !alreadyHasToolResult) {
        return {
          message: '',
          toolCalls: [
            {
              name: 'send_status_update',
              arguments: {
                recipient: 'Paulo',
                summary: `${label} deployment split validated.`,
              },
              id: `tool_use_${label}`,
            },
          ],
        };
      }

      return {
        message: `${label} deployment split validated.`,
      };
    },
  };
}

async function createDeployment() {
  const runStore = new InMemoryRunStore();
  const approvalInbox = new ApprovalInbox();
  const governanceRequests = [];
  const eventRequests = [];

  const governanceAdapter = new WebhookGovernanceAdapter({
    endpoint: 'https://control-plane.example/governance',
    transport: async request => {
      governanceRequests.push(request);
      return { ok: true };
    },
  });

  const eventSink = new WebhookEventSink({
    endpoint: 'https://control-plane.example/events',
    eventTypes: ['approval_requested', 'run_completed'],
    transport: async request => {
      eventRequests.push(request);
      return { ok: true };
    },
  });

  const tool = new Tool({
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
  });

  const apiService = new Agent(createAdapter('api-service'), {
    tools: [tool],
    runStore,
    approvalInbox,
    governanceHooks: new GovernanceHooks(governanceAdapter.asHooks()),
    eventBus: new EventBus({ sinks: [eventSink] }),
  });

  const workerService = new Agent(createAdapter('worker-service'), {
    tools: [tool],
    runStore,
  });

  async function submitRun(input) {
    return apiService.run(input);
  }

  async function resolveApproval(runId, reason = 'approved by control plane') {
    return apiService.resumeRun(runId, {
      approved: true,
      reason,
    });
  }

  async function continueOnWorker(runId) {
    const sourceRun = await runStore.getRun(runId);
    const envelope = await apiService.createDistributedEnvelope(runId, {
      action: 'replay',
      checkpointId: sourceRun.checkpoints[sourceRun.checkpoints.length - 1].id,
      metadata: {
        handoffTarget: 'worker-service',
        transport: 'queue',
      },
    });

    return workerService.continueDistributedRun(envelope);
  }

  return {
    runStore,
    approvalInbox,
    governanceRequests,
    eventRequests,
    apiService,
    workerService,
    submitRun,
    resolveApproval,
    continueOnWorker,
  };
}

async function main() {
  const deployment = await createDeployment();

  let apiRun = await deployment.submitRun('Send the deployment split update.');
  console.log('API run status:');
  console.log(apiRun.status);

  apiRun = await deployment.resolveApproval(apiRun.id);
  const workerRun = await deployment.continueOnWorker(apiRun.id);

  console.log('\nControl-plane governance events:');
  console.dir(
    deployment.governanceRequests.map(request => request.body.type),
    { depth: null }
  );

  console.log('\nControl-plane event sink events:');
  console.dir(
    deployment.eventRequests.map(request => request.body.event.type),
    { depth: null }
  );

  console.log('\nAPI run summary:');
  console.dir(RunInspector.summarize(apiRun), { depth: null });

  console.log('\nWorker run summary:');
  console.dir(RunInspector.summarize(workerRun), { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { createDeployment };
