const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const {
  Agent,
  ApprovalInbox,
  EventBus,
  ExtensionHost,
  FileJobStore,
  FileLayerStore,
  FileRunStore,
  GovernanceHooks,
  Memory,
  ProductionPolicyPack,
  RunInspector,
  Tool,
  WebhookEventSink,
} = require('../index');

function createAdapter() {
  return {
    getCapabilities: () => ({ generateText: true, toolCalling: true }),
    generateText: async (messages, options = {}) => {
      const hasToolResult = messages.some(message => message?.role === 'function');
      if (options.tools?.length && !hasToolResult) {
        return {
          message: '',
          toolCalls: [
            {
              name: 'send_status_update',
              arguments: {
                recipient: 'Paulo',
                summary: 'File-backed stack is healthy.',
              },
              id: 'file-backed-tool-call',
            },
          ],
        };
      }

      return { message: 'File-backed stack is healthy.' };
    },
  };
}

async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'agnostic-file-backed-stack-'));
  const runStore = new FileRunStore({ directory: path.join(root, 'runs') });
  const jobStore = new FileJobStore({ directory: path.join(root, 'jobs') });
  const layerStore = new FileLayerStore({ filePath: path.join(root, 'memory.json') });
  const approvalInbox = new ApprovalInbox();
  const mirroredEvents = [];

  const pack = new ProductionPolicyPack({
    environment: 'local-file-backed',
    protectedToolNames: ['send_status_update'],
  });

  const eventSink = new WebhookEventSink({
    endpoint: 'https://local-control-plane.example/events',
    eventTypes: ['approval_requested', 'run_completed'],
    transport: async request => {
      mirroredEvents.push(request.body.event.type);
      return { ok: true };
    },
  });

  const governanceHooks = new GovernanceHooks({
    onApprovalRequested: async payload => {
      await approvalInbox.add({
        id: payload.toolCall?.id || `${payload.runId}:approval`,
        ...payload,
      });
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
          sideEffectLevel: 'external_write',
        },
        implementation: async ({ recipient, summary }) => ({
          delivered: true,
          recipient,
          summary,
        }),
      }),
    ],
    runStore,
    approvalInbox,
    governanceHooks,
    eventBus: new EventBus({ sinks: [eventSink] }),
    extensionHost: new ExtensionHost({
      extensions: [pack.toExtension()],
    }),
    memory: new Memory({
      stores: {
        working: layerStore,
      },
    }),
  });

  await layerStore.set('current_stack', 'local-file-backed');
  await jobStore.saveJob({ id: 'daily-health-check', status: 'scheduled', handler: 'health-check' });

  let run = await agent.run('Send the file-backed stack update.');
  if (run.status === 'waiting_for_approval') {
    run = await agent.resumeRun(run.id, {
      approved: true,
      reason: 'approved in reference file-backed stack',
    });
  }

  console.log('File-backed stack summary:');
  console.dir(
    {
      root,
      runStatus: run.status,
      storedRuns: (await runStore.listRuns()).map(storedRun => storedRun.id),
      storedJobs: (await jobStore.listJobs()).map(job => job.id),
      memoryEntries: await layerStore.entries(),
      approvalRequests: await approvalInbox.list(),
      governanceEvents: pack.listGovernanceEvents().map(event => event.type),
      mirroredEvents,
      runSummary: RunInspector.summarize(run),
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
