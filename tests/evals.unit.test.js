const { Agent } = require('../src/agent/Agent');
const { Tool } = require('../src/tools/adapters/Tool');
const { RetryManager } = require('../src/utils/RetryManager');
const { RAG } = require('../src/rag/RAG');
const { LocalVectorStore } = require('../src/db/LocalVectorStore');
const { EvalHarness } = require('../src/runtime/EvalHarness');
const { InMemoryRunStore } = require('../src/runtime/stores/InMemoryRunStore');
const { LearningLoop } = require('../src/runtime/LearningLoop');
const { PolicyTuningAdvisor } = require('../src/runtime/PolicyTuningAdvisor');
const { HistoricalRoutingAdvisor } = require('../src/runtime/HistoricalRoutingAdvisor');
const { AdaptiveDecisionLedger } = require('../src/runtime/AdaptiveDecisionLedger');
const { AdaptiveGovernanceGate } = require('../src/runtime/AdaptiveGovernanceGate');
const { ApprovalInbox } = require('../src/runtime/ApprovalInbox');

class ToolEvalAdapter {
  async generateText(messages, { tools = [] } = {}) {
    const text = messages.map(message => String(message.content || '')).join('\n');

    if (messages.some(message => message.role === 'function')) {
      const lastResult = [...messages].reverse().find(message => message.role === 'function');
      return { message: `Final answer based on ${lastResult.content}` };
    }

    if (tools.length > 0 && text.includes('Use tool')) {
      return {
        message: '',
        toolCalls: [
          {
            name: tools[0].name,
            arguments: { query: 'status' },
            id: 'tool_use_eval_1',
          },
        ],
      };
    }

    return { message: 'tool-eval-default' };
  }
}

class RagEvalAdapter {
  async generateText(messages) {
    const blob = messages.map(message => String(message.content || '')).join('\n');
    const match = blob.match(/Retrieved context:\s*([\s\S]+)/);
    const grounded = match ? match[1].trim().split('\n')[0] : 'missing-context';
    return { message: `Grounded answer: ${grounded}` };
  }

  async embedChunks(chunks) {
    return chunks.map(chunk => ({
      embedding: [chunk.length, chunk.split(' ').length, 1],
    }));
  }
}

describe('Eval and benchmark discipline', () => {
  test('EvalHarness can run prompt, tool, and RAG regression scenarios', async () => {
    const retryManager = new RetryManager({ retries: 1, baseDelay: 1, maxDelay: 5 });
    const tool = new Tool({
      name: 'lookup_status',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
      implementation: async ({ query }) => ({ query, status: 'ok' }),
    });
    const toolAgent = new Agent(new ToolEvalAdapter(), {
      tools: [tool],
      retryManager,
    });

    const rag = new RAG({
      adapter: new RagEvalAdapter(),
      vectorStore: new LocalVectorStore(),
    });
    await rag.index(['Runtime control requires replay, branching, and inspection.']);
    const ragAgent = new Agent(new RagEvalAdapter(), {
      rag,
      retryManager,
      description: 'Use retrieved context when it is relevant.',
    });

    const harness = new EvalHarness({
      scenarios: [
        {
          id: 'prompt-regression',
          run: async () => 'runtime control ready',
          assert: output => output === 'runtime control ready',
        },
        {
          id: 'tool-selection-accuracy',
          run: async () => toolAgent.run('Use tool to check status'),
          assert: run =>
            run.toolCalls.some(call => (call.toolName || call.name) === 'lookup_status') &&
            String(run.output || '').includes('status'),
        },
        {
          id: 'rag-grounding',
          run: async () =>
            ragAgent.sendMessage('What does runtime control require according to the retrieved context?'),
          assert: output => String(output).includes('Runtime control requires replay, branching, and inspection.'),
        },
      ],
    });

    const report = await harness.run();

    expect(report.total).toBe(3);
    expect(report.failed).toBe(0);
    expect(report.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'prompt-regression', passed: true }),
        expect.objectContaining({ id: 'tool-selection-accuracy', passed: true }),
        expect.objectContaining({ id: 'rag-grounding', passed: true }),
      ])
    );
  });

  test('EvalHarness can run replay-based regression scenarios', async () => {
    const retryManager = new RetryManager({ retries: 1, baseDelay: 1, maxDelay: 5 });
    const runStore = new InMemoryRunStore();
    const tool = new Tool({
      name: 'lookup_status',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
      implementation: async ({ query }) => ({ query, status: 'ok' }),
    });
    const agent = new Agent(new ToolEvalAdapter(), {
      tools: [tool],
      retryManager,
      runStore,
    });

    const originalRun = await agent.run('Use tool to check status');
    const harness = new EvalHarness({
      scenarios: [
        {
          id: 'replay-regression',
          run: async () => agent.replayRun(originalRun.id),
          assert: replayRun =>
            replayRun.output === originalRun.output &&
            replayRun.status === originalRun.status &&
            replayRun.steps.length === originalRun.steps.length,
        },
      ],
    });

    const report = await harness.run();

    expect(report.total).toBe(1);
    expect(report.failed).toBe(0);
    expect(report.results).toEqual([
      expect.objectContaining({
        id: 'replay-regression',
        passed: true,
      }),
    ]);
  });

  test('EvalHarness can run adaptive-decision benchmark scenarios', async () => {
    const learningLoop = new LearningLoop();
    learningLoop.recordRun({
      id: 'run-low-confidence',
      status: 'completed',
      errors: [],
      toolCalls: [],
      toolResults: [],
      state: {
        assessment: {
          confidence: 0.45,
          evidenceConflicts: 1,
        },
        selfVerification: {
          action: 'require_approval',
        },
      },
      pendingApproval: { toolName: 'send_status_update' },
    });

    const branchAnalysis = {
      baselineRunId: 'baseline-run',
      bestRunId: 'replay-run',
      comparisons: [
        {
          runId: 'replay-run',
          diff: {
            firstDivergingStepIndex: 1,
          },
        },
      ],
    };

    const routingAdvisor = new HistoricalRoutingAdvisor({ learningLoop });
    routingAdvisor.recordOutcome({
      providerLabel: 'safe-provider',
      success: true,
      methodName: 'generateText',
      taskType: 'support',
      confidence: 0.92,
    });
    routingAdvisor.recordOutcome({
      providerLabel: 'safe-provider',
      success: true,
      methodName: 'generateText',
      taskType: 'support',
      confidence: 0.88,
    });
    routingAdvisor.recordOutcome({
      providerLabel: 'risky-provider',
      success: false,
      methodName: 'generateText',
      taskType: 'support',
      confidence: 0.31,
    });

    const providerCandidates = [
      {
        provider: { name: 'risky-provider' },
        profile: { labels: ['risky-provider'], taskTypes: ['support'], riskTier: 'high' },
      },
      {
        provider: { name: 'safe-provider' },
        profile: { labels: ['safe-provider'], taskTypes: ['support'], riskTier: 'medium' },
      },
    ];

    const policyAdvisor = new PolicyTuningAdvisor({ learningLoop });
    const adaptiveLedger = new AdaptiveDecisionLedger();
    const adaptiveGate = new AdaptiveGovernanceGate({
      ledger: adaptiveLedger,
      approvalInbox: new ApprovalInbox(),
    });

    const harness = new EvalHarness({
      scenarios: [
        {
          id: 'adaptive-routing-benchmark',
          run: async () =>
            routingAdvisor.rankProviders(providerCandidates, {
              methodName: 'generateText',
              args: [{}, { route: { taskType: 'support' } }],
            }),
          assert: ranked => ranked[0].provider.name === 'safe-provider',
        },
        {
          id: 'adaptive-policy-suggestion-benchmark',
          run: async () => policyAdvisor.buildSuggestions({ branchAnalysis }),
          assert: suggestions =>
            suggestions.some(
              suggestion =>
                suggestion.id === 'tighten-side-effect-policy' ||
                suggestion.id === 'promote-healthier-branch-baseline'
            ),
        },
        {
          id: 'adaptive-governance-benchmark',
          run: async () =>
            adaptiveGate.reviewSuggestion(
              {
                id: 'adaptive-routing-review',
                category: 'routing_policy',
                priority: 'high',
                suggestion: 'Promote replay-run as the support routing baseline.',
                evidence: { bestRunId: 'replay-run' },
              },
              {
                replay: { baselineRunId: 'baseline-run', bestRunId: 'replay-run' },
                rollback: { action: 'restore_baseline', runId: 'baseline-run' },
              }
            ),
          assert: result =>
            result.action === 'require_approval' &&
            result.request?.adaptiveEntryId === 'adaptive-routing-review',
        },
      ],
    });

    const report = await harness.run({ learningLoop });

    expect(report.total).toBe(3);
    expect(report.failed).toBe(0);
    expect(report.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'adaptive-routing-benchmark', passed: true }),
        expect.objectContaining({ id: 'adaptive-policy-suggestion-benchmark', passed: true }),
        expect.objectContaining({ id: 'adaptive-governance-benchmark', passed: true }),
      ])
    );
  });
});
