const { Agent } = require('../src/agent/Agent');
const { Tool } = require('../src/tools/adapters/Tool');
const { RetryManager } = require('../src/utils/RetryManager');
const { RAG } = require('../src/rag/RAG');
const { LocalVectorStore } = require('../src/db/LocalVectorStore');
const { EvalHarness } = require('../src/runtime/EvalHarness');
const { InvariantRegistry } = require('../src/runtime/InvariantRegistry');
const { AssuranceSuite } = require('../src/runtime/AssuranceSuite');
const { AssuranceGuardrail } = require('../src/runtime/AssuranceGuardrail');
const { AssuranceRecoveryPlanner } = require('../src/runtime/AssuranceRecoveryPlanner');
const { InMemoryRunStore } = require('../src/runtime/stores/InMemoryRunStore');
const { LearningLoop } = require('../src/runtime/LearningLoop');
const { PolicyTuningAdvisor } = require('../src/runtime/PolicyTuningAdvisor');
const { HistoricalRoutingAdvisor } = require('../src/runtime/HistoricalRoutingAdvisor');
const { AdaptiveDecisionLedger } = require('../src/runtime/AdaptiveDecisionLedger');
const { AdaptiveGovernanceGate } = require('../src/runtime/AdaptiveGovernanceGate');
const { ImprovementEffectTracker } = require('../src/runtime/ImprovementEffectTracker');
const { LearningBenchmarkSuite } = require('../src/runtime/LearningBenchmarkSuite');
const { ApprovalInbox } = require('../src/runtime/ApprovalInbox');
const { PolicyPack } = require('../src/runtime/PolicyPack');
const { PolicySimulator } = require('../src/runtime/PolicySimulator');
const { ProductionPolicyPack } = require('../src/runtime/ProductionPolicyPack');
const { CoordinationPolicyGate } = require('../src/runtime/CoordinationPolicyGate');
const { ApprovalEscalationPolicySuite } = require('../src/runtime/ApprovalEscalationPolicySuite');
const { Workflow } = require('../src/runtime/workflow/Workflow');
const { AgentWorkflowStep } = require('../src/runtime/workflow/AgentWorkflowStep');
const { WorkflowRunner } = require('../src/runtime/workflow/WorkflowRunner');
const { DelegationRuntime } = require('../src/runtime/DelegationRuntime');
const { DelegationContract } = require('../src/runtime/workflow/DelegationContract');

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

class WorkerEvalAdapter {
  constructor(label, { toolCalling = false } = {}) {
    this.label = label;
    this.toolCalling = toolCalling;
  }

  getCapabilities() {
    return {
      generateText: true,
      toolCalling: this.toolCalling,
    };
  }

  async generateText(messages) {
    const text = messages.map(message => String(message.content || '')).join('\n').toLowerCase();

    if (text.includes('turn this research into a short update')) {
      return { message: `${this.label} draft: replay, approvals, and traces` };
    }

    if (text.includes('list three runtime capabilities')) {
      return { message: `${this.label} research: replay, approvals, and traces` };
    }

    return { message: `${this.label} response` };
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

  test('LearningBenchmarkSuite benchmarks whether learned changes improve outcomes', async () => {
    const effectTracker = new ImprovementEffectTracker();
    effectTracker.record({
      proposalId: 'improvement-a',
      baseline: { averageConfidence: 0.4, failedEvaluations: 2 },
      outcome: { averageConfidence: 0.75, failedEvaluations: 0 },
    });

    const suite = new LearningBenchmarkSuite({
      effectTracker,
    });
    const report = await suite.run();

    expect(report).toEqual(
      expect.objectContaining({
        total: 2,
        failed: 0,
        results: expect.arrayContaining([
          expect.objectContaining({ id: 'learning-effect-improvement', passed: true }),
          expect.objectContaining({ id: 'learning-effect-net-positive', passed: true }),
        ]),
      })
    );
  });

  test('AssuranceSuite evaluates invariants and scenarios before rollout', async () => {
    const invariants = new InvariantRegistry({
      invariants: [
        {
          id: 'state-integrity',
          surface: 'state',
          check: async context => ({
            passed: context.stateIntegrity === true,
            reason: context.stateIntegrity === true ? null : 'State integrity failed.',
          }),
        },
      ],
    });
    const suite = new AssuranceSuite({
      invariants,
      scenarios: [
        {
          id: 'replay-safe',
          run: async () => ({ replayable: true }),
          assert: async output => output.replayable === true,
        },
      ],
    });

    const report = await suite.run({ stateIntegrity: true });

    expect(report.summarize()).toEqual(
      expect.objectContaining({
        failedInvariants: 0,
        failedScenarios: 0,
        verdict: 'allow',
      })
    );
  });

  test('Assurance guardrails and recovery plans react to failed rollout candidates', async () => {
    const invariants = new InvariantRegistry({
      invariants: [
        {
          id: 'coordination-safe',
          surface: 'coordination',
          check: async () => ({
            passed: false,
            reason: 'Coordination fallback was not ready.',
          }),
        },
      ],
    });
    const suite = new AssuranceSuite({
      invariants,
      scenarios: [
        {
          id: 'recovery-check',
          run: async () => ({ ok: true }),
          assert: async output => output.ok === true,
        },
      ],
    });

    const report = await suite.run({});
    const guardrail = new AssuranceGuardrail().evaluate(report);
    const recovery = new AssuranceRecoveryPlanner().plan(report);

    expect(guardrail).toEqual(
      expect.objectContaining({
        action: 'block_rollout',
      })
    );
    expect(recovery).toEqual(
      expect.objectContaining({
        action: 'rollback_or_quarantine',
        regressionLinks: expect.arrayContaining([
          expect.objectContaining({
            sourceId: 'coordination-safe',
            surface: 'coordination',
          }),
        ]),
      })
    );
  });

  test('EvalHarness can run policy simulation scenarios', async () => {
    const pack = new PolicyPack({
      id: 'policy-pack',
      name: 'policy-benchmark',
      version: '1.0.0',
      rules: [
        {
          id: 'deny-destructive',
          sideEffectLevels: ['destructive'],
          action: 'deny',
        },
      ],
    });
    const simulator = new PolicySimulator({ policyPack: pack });
    const harness = new EvalHarness({
      scenarios: [
        {
          id: 'policy-simulation-benchmark',
          run: async () =>
            simulator.simulateRequests([
              {
                name: 'delete_records',
                metadata: {
                  sideEffectLevel: 'destructive',
                },
              },
            ]),
          assert: report =>
            report.summarize().denied === 1 &&
            report.summarize().ruleCounts['deny-destructive'] === 1,
        },
      ],
    });

    const report = await harness.run();

    expect(report.total).toBe(1);
    expect(report.failed).toBe(0);
    expect(report.results).toEqual([
      expect.objectContaining({
        id: 'policy-simulation-benchmark',
        passed: true,
      }),
    ]);
  });

  test('ApprovalEscalationPolicySuite can simulate approval and escalation policy scenarios before rollout', async () => {
    const simulator = new PolicySimulator({
      policyPack: new ProductionPolicyPack({
        environment: 'staging',
        protectedToolNames: ['send_status_update'],
        denySideEffectLevels: ['destructive'],
      }).toPolicyPack(),
    });
    const coordinationGate = new CoordinationPolicyGate({
      scopes: {
        runtime: new PolicyPack({
          id: 'runtime-policy-pack',
          name: 'runtime-policy-pack',
          rules: [
            {
              id: 'require-review-for-branch-retry',
              toolNames: ['coordination:branch_and_retry'],
              action: 'require_approval',
            },
          ],
        }),
        agent: new PolicyPack({
          id: 'coordination-policy-pack',
          name: 'coordination-policy-pack',
          rules: [
            {
              id: 'deny-policy-retries',
              toolNames: ['coordination:branch_and_retry'],
              tags: ['policy'],
              action: 'deny',
            },
          ],
        }),
      },
    });

    const suite = new ApprovalEscalationPolicySuite({
      policySimulator: simulator,
      coordinationPolicyGate: coordinationGate,
      approvalScenarios: [
        {
          id: 'approval-protected-tool',
          toolName: 'send_status_update',
          metadata: { sideEffectLevel: 'external_write' },
          expectedAction: 'require_approval',
          expectedRuleId: 'staging-protected-tools',
        },
      ],
      escalationScenarios: [
        {
          id: 'escalate-policy-branch-retry',
          resolution: {
            action: 'branch_and_retry',
            rankedCritiques: [{ failureType: 'policy', severity: 'high' }],
          },
          context: { taskFamily: 'release_review' },
          expectedPolicyAction: 'deny',
          expectedGatedAction: 'escalate',
        },
      ],
    });

    const report = await suite.run();

    expect(report).toMatchObject({
      total: 2,
      passed: 2,
      failed: 0,
      results: expect.arrayContaining([
        expect.objectContaining({ id: 'approval-protected-tool', passed: true }),
        expect.objectContaining({ id: 'escalate-policy-branch-retry', passed: true }),
      ]),
    });
  });

  test('EvalHarness can run worker-coordination benchmark scenarios', async () => {
    const childRunStore = new InMemoryRunStore();
    const workflowRunStore = new InMemoryRunStore();
    const delegationRuntime = new DelegationRuntime();
    const researcher = new Agent(new WorkerEvalAdapter('researcher'), {
      runStore: childRunStore,
    });
    const writer = new Agent(new WorkerEvalAdapter('writer'), {
      runStore: childRunStore,
    });

    const workflow = new Workflow({
      id: 'worker-coordination-benchmark',
      steps: [
        new AgentWorkflowStep({
          id: 'research',
          agent: researcher,
          delegationRuntime,
          delegationContract: new DelegationContract({
            id: 'research-contract',
            assignee: 'researcher',
            requiredInputs: ['prompt'],
            requiredCapabilities: ['generateText'],
          }),
          prompt: 'List three runtime capabilities in bullet form.',
        }),
        new AgentWorkflowStep({
          id: 'draft',
          agent: writer,
          dependsOn: ['research'],
          delegationRuntime,
          delegationContract: new DelegationContract({
            id: 'writer-contract',
            assignee: 'writer',
            requiredInputs: ['prompt'],
            requiredCapabilities: ['generateText'],
          }),
          prompt: ({ results }) => `Turn this research into a short update:\n${results.research.output}`,
        }),
      ],
    });

    const contractFailureWorkflow = new Workflow({
      id: 'worker-contract-failure-benchmark',
      steps: [
        new AgentWorkflowStep({
          id: 'gated_worker',
          agent: new Agent(new WorkerEvalAdapter('gated-worker', { toolCalling: false }), {
            runStore: childRunStore,
          }),
          delegationContract: new DelegationContract({
            id: 'gated-contract',
            assignee: 'gated-worker',
            requiredInputs: ['prompt'],
            requiredCapabilities: ['toolCalling'],
          }),
          prompt: 'Handle a tool-dependent worker task.',
        }),
      ],
    });

    const harness = new EvalHarness({
      scenarios: [
        {
          id: 'worker-coordination-lineage-benchmark',
          run: async () => new WorkflowRunner({ workflow, runStore: workflowRunStore }).run('Prepare a worker report'),
          assert: run =>
            run.status === 'completed' &&
            run.metrics.childRuns.count === 2 &&
            run.metrics.childRuns.items.length === 2 &&
            run.events.some(event => event.type === 'delegation_completed') &&
            String(run.output?.draft?.output || '').includes('replay, approvals, and traces'),
        },
        {
          id: 'worker-coordination-contract-benchmark',
          run: async () => {
            try {
              await new WorkflowRunner({
                workflow: contractFailureWorkflow,
                runStore: workflowRunStore,
              }).run('Prepare a gated worker task');
              return null;
            } catch (error) {
              return error.message || String(error);
            }
          },
          assert: message => String(message).includes('requires capability "toolCalling"'),
        },
      ],
    });

    const report = await harness.run();

    expect(report.total).toBe(2);
    expect(report.failed).toBe(0);
    expect(report.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'worker-coordination-lineage-benchmark', passed: true }),
        expect.objectContaining({ id: 'worker-coordination-contract-benchmark', passed: true }),
      ])
    );
  });
});
