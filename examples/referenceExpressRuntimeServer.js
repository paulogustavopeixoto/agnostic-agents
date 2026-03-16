require('dotenv').config();

const express = require('express');

const {
  Agent,
  Tool,
  OpenAIAdapter,
  InMemoryRunStore,
  ApprovalInbox,
  GovernanceHooks,
  RunInspector,
} = require('../index');

async function createServer() {
  const app = express();
  app.use(express.json());

  const runStore = new InMemoryRunStore();
  const approvalInbox = new ApprovalInbox();

  const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY, {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  });

  const sendStatusUpdate = new Tool({
    name: 'send_status_update',
    description: 'Send an external status update.',
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
      verificationPolicy: 'require_verifier',
      sideEffectLevel: 'external_write',
    },
    implementation: async ({ recipient, summary }) => ({
      delivered: true,
      recipient,
      summary,
      deliveredAt: new Date().toISOString(),
    }),
  });

  const governanceHooks = new GovernanceHooks({
    onApprovalRequested: async payload => {
      await approvalInbox.add({
        id: payload.toolCall?.id || `${payload.runId}:approval`,
        ...payload,
      });
    },
  });

  const agent = new Agent(adapter, {
    tools: [sendStatusUpdate],
    runStore,
    approvalInbox,
    governanceHooks,
    verifier: adapter,
    defaultConfig: { selfVerify: true, temperature: 0.2 },
  });

  app.post('/runs', async (req, res) => {
    try {
      const run = await agent.run(req.body.input, req.body.config || {});
      res.status(201).json(RunInspector.summarize(run));
    } catch (error) {
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  app.post('/runs/:runId/resume', async (req, res) => {
    try {
      const run = await agent.resumeRun(req.params.runId, req.body || {});
      res.json(RunInspector.summarize(run));
    } catch (error) {
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  app.get('/runs/:runId', async (req, res) => {
    try {
      const run = await runStore.getRun(req.params.runId);
      if (!run) {
        res.status(404).json({ error: 'Run not found.' });
        return;
      }
      res.json(RunInspector.summarize(run));
    } catch (error) {
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  app.get('/approvals', async (_req, res) => {
    res.json(await approvalInbox.list());
  });

  return app;
}

if (require.main === module) {
  createServer()
    .then(app => {
      const port = Number(process.env.PORT || 3000);
      app.listen(port, () => {
        console.log(`Reference runtime server listening on http://localhost:${port}`);
      });
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { createServer };
