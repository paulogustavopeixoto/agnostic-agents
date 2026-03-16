const fs = require('fs');
const os = require('os');
const path = require('path');

const pkg = require('../index');
const { Tool } = require('../src/tools/adapters/Tool');
const { Memory } = require('../src/agent/Memory');
const { InMemoryLayerStore } = require('../src/agent/memory/InMemoryLayerStore');
const { FileLayerStore } = require('../src/agent/memory/FileLayerStore');
const { RetryManager } = require('../src/utils/RetryManager');
const { RAG } = require('../src/rag/RAG');
const { VectorStoreRetriever } = require('../src/rag/retrievers/VectorStoreRetriever');
const { LocalVectorStore } = require('../src/db/LocalVectorStore');
const { FallbackRouter } = require('../src/llm/FallbackRouter');
const { MCPClient } = require('../src/mcp/MCPClient');
const { OpenAPILoader } = require('../src/api/OpenAPILoader');
const { ApiLoader } = require('../src/api/ApiLoader');
const { Run } = require('../src/runtime/Run');
const { EvidenceGraph } = require('../src/runtime/EvidenceGraph');
const { EvalHarness } = require('../src/runtime/EvalHarness');
const { LearningLoop } = require('../src/runtime/LearningLoop');
const { ApprovalInbox } = require('../src/runtime/ApprovalInbox');
const { BackgroundJobScheduler } = require('../src/runtime/BackgroundJobScheduler');
const { DelegationRuntime } = require('../src/runtime/DelegationRuntime');
const { PlanningRuntime } = require('../src/runtime/PlanningRuntime');
const { TraceSerializer } = require('../src/runtime/TraceSerializer');
const { ToolPolicy } = require('../src/runtime/ToolPolicy');
const { EventBus } = require('../src/runtime/EventBus');
const { InMemoryRunStore } = require('../src/runtime/stores/InMemoryRunStore');
const { FileRunStore } = require('../src/runtime/stores/FileRunStore');
const { InMemoryJobStore } = require('../src/runtime/stores/InMemoryJobStore');
const { FileJobStore } = require('../src/runtime/stores/FileJobStore');
const { BaseEnvironmentAdapter } = require('../src/runtime/environments/BaseEnvironmentAdapter');
const { BrowserEnvironmentAdapter } = require('../src/runtime/environments/BrowserEnvironmentAdapter');
const { ShellEnvironmentAdapter } = require('../src/runtime/environments/ShellEnvironmentAdapter');
const { ApiEnvironmentAdapter } = require('../src/runtime/environments/ApiEnvironmentAdapter');
const { QueueEnvironmentAdapter } = require('../src/runtime/environments/QueueEnvironmentAdapter');
const { FileEnvironmentAdapter } = require('../src/runtime/environments/FileEnvironmentAdapter');
const { Workflow } = require('../src/runtime/workflow/Workflow');
const { WorkflowStep } = require('../src/runtime/workflow/WorkflowStep');
const { ExecutionGraph } = require('../src/runtime/workflow/ExecutionGraph');
const { DelegationContract } = require('../src/runtime/workflow/DelegationContract');
const { AgentWorkflowStep } = require('../src/runtime/workflow/AgentWorkflowStep');
const { WorkflowRunner } = require('../src/runtime/workflow/WorkflowRunner');
const { ToolValidator } = require('../src/utils/ToolValidator');

describe('Package/module unit tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('index exports the public surface', () => {
    expect(pkg.Agent).toBeDefined();
    expect(pkg.Tool).toBeDefined();
    expect(pkg.Memory).toBeDefined();
    expect(pkg.InMemoryLayerStore).toBeDefined();
    expect(pkg.FileLayerStore).toBeDefined();
    expect(pkg.RAG).toBeDefined();
    expect(pkg.BaseRetriever).toBeDefined();
    expect(pkg.VectorStoreRetriever).toBeDefined();
    expect(pkg.FallbackRouter).toBeDefined();
    expect(pkg.MCPClient).toBeDefined();
    expect(pkg.OpenAPILoader).toBeDefined();
    expect(pkg.ApiLoader).toBeDefined();
    expect(pkg.Run).toBeDefined();
    expect(pkg.ToolPolicy).toBeDefined();
    expect(pkg.EventBus).toBeDefined();
    expect(pkg.TraceSerializer).toBeDefined();
    expect(pkg.EvidenceGraph).toBeDefined();
    expect(pkg.EvalHarness).toBeDefined();
    expect(pkg.LearningLoop).toBeDefined();
    expect(pkg.ApprovalInbox).toBeDefined();
    expect(pkg.BackgroundJobScheduler).toBeDefined();
    expect(pkg.DelegationRuntime).toBeDefined();
    expect(pkg.PlanningRuntime).toBeDefined();
    expect(pkg.InMemoryRunStore).toBeDefined();
    expect(pkg.FileRunStore).toBeDefined();
    expect(pkg.InMemoryJobStore).toBeDefined();
    expect(pkg.FileJobStore).toBeDefined();
    expect(pkg.BaseEnvironmentAdapter).toBeDefined();
    expect(pkg.BrowserEnvironmentAdapter).toBeDefined();
    expect(pkg.ShellEnvironmentAdapter).toBeDefined();
    expect(pkg.ApiEnvironmentAdapter).toBeDefined();
    expect(pkg.QueueEnvironmentAdapter).toBeDefined();
    expect(pkg.FileEnvironmentAdapter).toBeDefined();
    expect(pkg.Workflow).toBeDefined();
    expect(pkg.WorkflowStep).toBeDefined();
    expect(pkg.ExecutionGraph).toBeDefined();
    expect(pkg.DelegationContract).toBeDefined();
    expect(pkg.AgentWorkflowStep).toBeDefined();
    expect(pkg.WorkflowRunner).toBeDefined();
    expect(pkg.RunInspector).toBeDefined();
    expect(pkg.ConsoleDebugSink).toBeDefined();
    expect(pkg.InvalidToolCallError).toBeDefined();
    expect(pkg.RunPausedError).toBeDefined();
    expect(pkg.RunCancelledError).toBeDefined();
  });

  test('Tool exposes unified schema and provider-specific representations', async () => {
    const tool = new Tool({
      name: 'calculate',
      description: 'Do math',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string' },
        },
        required: ['expression'],
      },
      implementation: async ({ expression }) => ({ result: expression }),
    });

    expect(tool.toUnifiedSchema()).toMatchObject({
      name: 'calculate',
      description: 'Do math',
      metadata: expect.objectContaining({
        sideEffectLevel: 'none',
        executionPolicy: 'auto',
        verificationPolicy: 'auto',
      }),
    });
    expect(tool.toOpenAIFunction()).toEqual({
      name: 'calculate',
      description: 'Do math',
      parameters: tool.parameters,
    });
    expect(tool.toAnthropicTool()).toEqual({
      name: 'calculate',
      description: 'Do math',
      input_schema: tool.parameters,
    });
    await expect(tool.call({ expression: '1+1' })).resolves.toEqual({ result: '1+1' });
  });

  test('Run tracks state and serializes cleanly', () => {
    const run = new Run({ input: 'hello' });
    run.setStatus('running');
    run.addMessage({ role: 'user', content: 'hello' });
    run.addStep({ id: 'step-1', type: 'model', status: 'completed' });
    run.addCheckpoint({ id: 'cp-1', label: 'checkpoint' });
    run.addEvent({ type: 'run_started' });
    run.pendingPause = { reason: 'pause' };
    run.recordUsage({ prompt: 10, completion: 5, total: 15 });
    run.recordCost(0.12);
    run.recordTiming('modelMs', 42);
    run.setStatus('completed');

    const restored = Run.fromJSON(run.toJSON());
    expect(restored.id).toBe(run.id);
    expect(restored.status).toBe('completed');
    expect(restored.messages).toHaveLength(1);
    expect(restored.steps).toHaveLength(1);
    expect(restored.checkpoints).toHaveLength(1);
    expect(restored.events).toHaveLength(1);
    expect(restored.pendingPause).toEqual({ reason: 'pause' });
    expect(restored.metrics.tokenUsage.total).toBe(15);
    expect(restored.metrics.cost).toBe(0.12);
    expect(pkg.RunInspector.summarize(restored).lineage).toEqual(
      expect.objectContaining({
        rootRunId: run.id,
        childRunIds: [],
      })
    );
  });

  test('Run aggregates child-run metrics once', () => {
    const parent = new Run({ input: 'parent' });
    const child = new Run({ input: 'child' });
    child.recordUsage({ prompt: 3, completion: 2, total: 5 });
    child.recordCost(0.25);
    child.recordTiming('modelMs', 42);

    parent.aggregateChildRun(child, { scope: 'unit' });
    parent.aggregateChildRun(child, { scope: 'unit' });

    expect(parent.metrics.childRuns.count).toBe(1);
    expect(parent.metrics.tokenUsage.total).toBe(5);
    expect(parent.metrics.cost).toBe(0.25);
    expect(parent.metrics.timings.modelMs).toBe(42);
  });

  test('Run can branch from a checkpoint snapshot', () => {
    const run = new Run({ input: 'branch-me' });
    run.setStatus('running');
    run.addMessage({ role: 'user', content: 'branch-me' });
    run.addCheckpoint({
      id: 'cp-1',
      label: 'before_tool',
      snapshot: run.createCheckpointSnapshot(),
      status: run.status,
    });
    run.setStatus('completed');

    const branch = run.branchFromCheckpoint('cp-1');
    expect(branch.id).not.toBe(run.id);
    expect(branch.status).toBe('paused');
    expect(branch.messages).toEqual(run.messages);
    expect(branch.metadata.lineage).toEqual(
      expect.objectContaining({
        rootRunId: run.id,
        branchOriginRunId: run.id,
        branchCheckpointId: 'cp-1',
      })
    );
  });

  test('TraceSerializer exports and imports stable run traces', () => {
    const run = new Run({ input: 'trace-me' });
    run.setStatus('completed');
    run.output = 'done';

    const trace = TraceSerializer.exportRun(run, { label: 'unit-test' });
    expect(trace).toEqual(
      expect.objectContaining({
        schemaVersion: '1.0',
        format: 'agnostic-agents-run-trace',
        metadata: { label: 'unit-test' },
      })
    );

    const imported = TraceSerializer.importRun(trace);
    expect(imported).toBeInstanceOf(Run);
    expect(imported.id).toBe(run.id);
    expect(imported.output).toBe('done');
  });

  test('EvidenceGraph collects nodes and edges', () => {
    const graph = new EvidenceGraph();
    graph.addNode({ id: 'q1', type: 'query', label: 'What happened?' });
    graph.addNode({ id: 'r1', type: 'retrieval', label: 'Source text' });
    graph.addEdge({ from: 'q1', to: 'r1', type: 'supports' });

    expect(graph.summarize()).toEqual({
      nodes: 2,
      edges: 1,
      conflicts: 0,
      nodeTypes: ['query', 'retrieval'],
    });
  });

  test('EvidenceGraph detects simple negation conflicts', () => {
    const graph = new EvidenceGraph();
    graph.addNode({ id: 'a', type: 'claim', label: 'The deployment is ready.' });
    graph.addNode({ id: 'b', type: 'claim', label: 'The deployment is not ready.' });

    expect(graph.detectConflicts()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          left: 'a',
          right: 'b',
          type: 'negation_conflict',
        }),
        expect.objectContaining({
          left: 'a',
          right: 'b',
          type: 'subject_predicate_conflict',
        }),
      ])
    );
  });

  test('EvalHarness runs scenarios and reports pass/fail totals', async () => {
    const learningLoop = new LearningLoop();
    const harness = new EvalHarness({
      scenarios: [
        {
          id: 'ok',
          run: async () => 'hello',
          assert: result => result === 'hello',
        },
        {
          id: 'fail',
          run: async () => 'bad',
          assert: result => result === 'hello',
        },
      ],
    });

    await expect(harness.run({ learningLoop })).resolves.toEqual(
      expect.objectContaining({
        total: 2,
        passed: 1,
        failed: 1,
      })
    );
    expect(learningLoop.summarize()).toEqual(
      expect.objectContaining({
        evaluations: 1,
        failedEvaluations: 1,
      })
    );
  });

  test('run stores persist and reload runs', async () => {
    const run = new Run({ input: 'persist me' });
    run.setStatus('completed');

    const memoryStore = new InMemoryRunStore();
    await memoryStore.saveRun(run);
    await expect(memoryStore.getRun(run.id)).resolves.toMatchObject({ id: run.id });

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-store-'));
    const fileStore = new FileRunStore({ directory: tmpDir });
    await fileStore.saveRun(run);
    await expect(fileStore.getRun(run.id)).resolves.toMatchObject({ id: run.id });
  });

  test('ToolPolicy honors explicit approval requirements', async () => {
    const policy = new ToolPolicy();
    const tool = new Tool({
      name: 'send_email',
      parameters: { type: 'object', properties: {} },
      metadata: { executionPolicy: 'require_approval' },
      implementation: async () => ({ ok: true }),
    });

    expect(policy.evaluate(tool, {})).toEqual({
      action: 'require_approval',
      reason: 'Tool requires explicit approval.',
      source: 'metadata',
    });
  });

  test('ToolPolicy supports declarative authorization rules', () => {
    const policy = new ToolPolicy({
      rules: [
        {
          id: 'deny-delete',
          toolNames: ['delete_records'],
          action: 'deny',
          reason: 'Deletes are blocked in this environment.',
        },
        {
          id: 'approve-external',
          sideEffectLevels: ['external_write'],
          action: 'require_approval',
          reason: 'External writes require approval.',
        },
      ],
    });

    const deleteTool = new Tool({
      name: 'delete_records',
      parameters: { type: 'object', properties: {} },
      implementation: async () => ({ ok: true }),
    });
    const notifyTool = new Tool({
      name: 'notify_user',
      parameters: { type: 'object', properties: {} },
      metadata: { sideEffectLevel: 'external_write' },
      implementation: async () => ({ ok: true }),
    });

    expect(policy.evaluate(deleteTool, {}, {})).toEqual(
      expect.objectContaining({
        action: 'deny',
        ruleId: 'deny-delete',
        source: 'rule',
      })
    );
    expect(policy.evaluate(notifyTool, {}, {})).toEqual(
      expect.objectContaining({
        action: 'require_approval',
        ruleId: 'approve-external',
        source: 'rule',
      })
    );
  });

  test('EventBus dispatches events to function and object sinks', async () => {
    const seen = [];
    const eventBus = new EventBus({
      sinks: [
        async event => {
          seen.push(`fn:${event.type}`);
        },
        {
          handleEvent: async event => {
            seen.push(`obj:${event.type}`);
          },
        },
      ],
    });

    await eventBus.emit({ type: 'run_started' }, {});
    expect(seen).toEqual(['fn:run_started', 'obj:run_started']);
  });

  test('FallbackRouter falls through providers and exposes merged capabilities', async () => {
    const events = [];
    const providerA = {
      getCapabilities: () => ({ generateText: true, toolCalling: false }),
      generateText: jest.fn().mockRejectedValue(new Error('primary failed')),
    };
    const providerB = {
      getCapabilities: () => ({ generateText: true, toolCalling: true }),
      generateText: jest.fn().mockResolvedValue({ message: 'ok from fallback' }),
    };

    const router = new FallbackRouter({
      providers: [providerA, providerB],
      onFallback: async info => events.push(info.to === providerB ? 'fallback' : 'other'),
    });

    await expect(router.generateText([{ role: 'user', content: 'hello' }])).resolves.toEqual(
      expect.objectContaining({
        message: 'ok from fallback',
        routing: expect.any(Object),
      })
    );
    expect(router.getCapabilities()).toEqual(
      expect.objectContaining({ generateText: true, toolCalling: true })
    );
    expect(events).toEqual(['fallback']);
  });

  test('FallbackRouter can route by cost, risk, and task hints before fallback', async () => {
    const cheapProvider = {
      getCapabilities: () => ({ generateText: true, toolCalling: true }),
      generateText: jest.fn().mockResolvedValue({ message: 'cheap route' }),
    };
    const safeProvider = {
      getCapabilities: () => ({ generateText: true, toolCalling: true }),
      generateText: jest.fn().mockResolvedValue({ message: 'safe route' }),
    };

    const router = new FallbackRouter({
      providers: [
        {
          provider: cheapProvider,
          profile: { costTier: 'low', riskTier: 'medium', taskTypes: ['summarization'] },
        },
        {
          provider: safeProvider,
          profile: { costTier: 'high', riskTier: 'high', taskTypes: ['verification'] },
        },
      ],
    });

    const cheapResult = await router.generateText([{ role: 'user', content: 'summarize' }], {
      route: { hints: { cost: 'low', taskType: 'summarization' } },
    });
    expect(cheapResult).toEqual(
      expect.objectContaining({
        message: 'cheap route',
        routing: expect.objectContaining({
          selectedProfile: expect.objectContaining({ costTier: 'low' }),
        }),
      })
    );

    const safeResult = await router.generateText([{ role: 'user', content: 'verify' }], {
      route: { hints: { risk: 'high', taskType: 'verification' } },
    });
    expect(safeResult).toEqual(
      expect.objectContaining({
        message: 'safe route',
        routing: expect.objectContaining({
          selectedProfile: expect.objectContaining({ riskTier: 'high' }),
        }),
      })
    );

    expect(cheapProvider.generateText).toHaveBeenCalledTimes(1);
    expect(safeProvider.generateText).toHaveBeenCalledTimes(1);
  });

  test('Workflow validates step definitions and dependencies', () => {
    const step = new WorkflowStep({
      id: 'collect',
      run: async () => 'ok',
    });

    expect(new Workflow({ id: 'wf', steps: [step] }).steps).toHaveLength(1);
    expect(
      () =>
        new Workflow({
          id: 'broken',
          steps: [{ id: 'a', dependsOn: ['missing'], run: async () => null }],
        })
    ).toThrow('depends on unknown step');
  });

  test('DelegationContract validates required inputs and serializes cleanly', () => {
    const contract = new DelegationContract({
      id: 'delegate',
      requiredInputs: ['prompt'],
      requiredCapabilities: ['toolCalling'],
    });

    expect(contract.toJSON()).toEqual(
      expect.objectContaining({
        id: 'delegate',
        requiredInputs: ['prompt'],
        requiredCapabilities: ['toolCalling'],
      })
    );

    expect(() => contract.validateInput({})).toThrow('missing required input "prompt"');
    expect(() =>
      contract.validateCapabilities({
        adapter: { getCapabilities: () => ({ toolCalling: false }) },
      })
    ).toThrow('requires capability "toolCalling"');
  });

  test('ApprovalInbox stores and resolves approval requests', async () => {
    const inbox = new ApprovalInbox();
    await inbox.add({ runId: 'run-1', toolName: 'send_email' });
    await expect(inbox.get('run-1')).resolves.toEqual(
      expect.objectContaining({ toolName: 'send_email' })
    );
    await inbox.resolve('run-1');
    await expect(inbox.get('run-1')).resolves.toBeNull();
  });

  test('BackgroundJobScheduler executes due jobs and records results', async () => {
    const scheduler = new BackgroundJobScheduler();
    await scheduler.schedule({
      id: 'job-1',
      runAt: '2020-01-01T00:00:00.000Z',
      run: async () => 'done',
    });

    const results = await scheduler.runDueJobs(new Date('2020-01-01T00:00:01.000Z'));
    expect(results).toEqual([
      expect.objectContaining({
        id: 'job-1',
        status: 'completed',
        result: 'done',
      }),
    ]);
  });

  test('BackgroundJobScheduler persists recurring jobs through a file store', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'job-store-'));
    const store = new FileJobStore({ directory: tmpDir });
    const scheduler = new BackgroundJobScheduler({
      store,
      handlers: {
        ping: async payload => ({ echoed: payload.value }),
      },
    });

    await scheduler.schedule({
      id: 'job-2',
      handler: 'ping',
      payload: { value: 'pong' },
      runAt: '2020-01-01T00:00:00.000Z',
      intervalMs: 1000,
      maxRuns: 2,
    });

    const firstRun = await scheduler.runDueJobs(new Date('2020-01-01T00:00:00.500Z'));
    expect(firstRun[0]).toEqual(
      expect.objectContaining({
        id: 'job-2',
        status: 'scheduled',
        runCount: 1,
        result: { echoed: 'pong' },
      })
    );

    const rehydrated = new BackgroundJobScheduler({
      store,
      handlers: {
        ping: async payload => ({ echoed: payload.value }),
      },
    });
    const secondRun = await rehydrated.runDueJobs(new Date('2020-01-01T00:00:02.000Z'));
    expect(secondRun[0]).toEqual(
      expect.objectContaining({
        id: 'job-2',
        status: 'completed',
        runCount: 2,
      })
    );
  });

  test('BaseEnvironmentAdapter and specializations expose runtime environment contracts', async () => {
    const adapter = new BaseEnvironmentAdapter({
      kind: 'custom',
      actions: ['write'],
      metadata: { scope: 'unit' },
      execute: async (_action, payload) => payload.value,
    });

    await expect(adapter.execute('write', { value: 'ok' })).resolves.toBe('ok');
    expect(adapter.describe()).toEqual({
      kind: 'custom',
      actions: ['write'],
      metadata: { scope: 'unit' },
    });
    expect(new BrowserEnvironmentAdapter().kind).toBe('browser');
    expect(new ShellEnvironmentAdapter().kind).toBe('shell');
    expect(new ApiEnvironmentAdapter().kind).toBe('api');
    expect(new QueueEnvironmentAdapter().kind).toBe('queue');
    expect(new FileEnvironmentAdapter().kind).toBe('file');
  });

  test('DelegationRuntime delegates child runs under explicit lineage', async () => {
    const runtime = new DelegationRuntime();
    const parentRun = new Run({ input: 'parent' });
    const agent = {
      adapter: { getCapabilities: () => ({ toolCalling: true }) },
      run: jest.fn(async (_prompt, config) =>
        new Run({
          input: 'child',
          output: 'delegated',
          status: 'completed',
          metadata: config.metadata,
        })
      ),
    };

    const result = await runtime.delegate({
      parentRun,
      agent,
      prompt: 'Do work',
      contract: {
        id: 'contract-1',
        requiredInputs: ['prompt'],
        requiredCapabilities: ['toolCalling'],
      },
      metadata: { assignee: 'delegate' },
    });

    expect(result.childRun.output).toBe('delegated');
    expect(parentRun.metadata.lineage.childRunIds).toContain(result.childRun.id);
    expect(parentRun.metrics.childRuns.count).toBe(1);
    expect(parentRun.events.map(event => event.type)).toEqual(
      expect.arrayContaining(['delegation_runtime_started', 'delegation_runtime_completed'])
    );
  });

  test('PlanningRuntime supports planning, verification, and recovery phases', async () => {
    const runtime = new PlanningRuntime({
      planner: async ({ input }) => [{ id: 'step-1', task: input }],
      executor: async ({ plan }) => ({ completed: plan.length, valid: false }),
      verifier: async ({ result }) => ({ status: result.valid ? 'passed' : 'recover' }),
      recovery: async ({ plan }) => ({ plan: [...plan, { id: 'step-2', task: 'retry' }] }),
    });

    const run = await runtime.run('draft update');
    expect(run.status).toBe('completed');
    expect(run.output.plan).toHaveLength(2);
    expect(run.output.recoveries).toHaveLength(1);
    expect(run.events.map(event => event.type)).toEqual(
      expect.arrayContaining(['plan_created', 'plan_verified', 'plan_recovered', 'planning_completed'])
    );
  });

  test('PlanningRuntime revises the plan after execution failure', async () => {
    let firstAttempt = true;
    const runtime = new PlanningRuntime({
      planner: async () => [{ id: 'initial' }],
      executor: async ({ plan }) => {
        if (firstAttempt) {
          firstAttempt = false;
          throw new Error(`failed:${plan[0].id}`);
        }
        return { ok: true, planLength: plan.length };
      },
      recovery: async ({ error }) => ({
        reason: error.message,
        plan: [{ id: 'revised' }, { id: 'stabilize' }],
      }),
    });

    const run = await runtime.run('recover me');
    expect(run.status).toBe('completed');
    expect(run.output.plan).toHaveLength(2);
    expect(run.events.map(event => event.type)).toEqual(
      expect.arrayContaining(['plan_execution_failed', 'plan_recovered', 'planning_completed'])
    );
  });

  test('LearningLoop builds recommendations from runs and evals', () => {
    const learningLoop = new LearningLoop();
    learningLoop.recordRun(
      new Run({
        input: 'bad run',
        status: 'failed',
        errors: [{ message: 'boom' }],
        state: { selfVerification: { action: 'require_approval' } },
      })
    );
    learningLoop.recordEvaluation({ total: 1, passed: 0, failed: 1, results: [] });

    expect(learningLoop.buildRecommendations()).toEqual(
      expect.arrayContaining([
        'Investigate failed runs and add replay-based regression coverage.',
        'Tighten prompts, tool contracts, or policies for scenarios failing the eval harness.',
        'Review verifier denials and require approval or stronger routing for risky actions.',
      ])
    );
  });

  test('ExecutionGraph builds dependency edges from workflows', () => {
    const workflow = new Workflow({
      id: 'graph-flow',
      steps: [
        { id: 'a', run: async () => 'a' },
        { id: 'b', dependsOn: ['a'], run: async () => 'b' },
      ],
    });

    const graph = workflow.toExecutionGraph();
    expect(graph).toBeInstanceOf(ExecutionGraph);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'a', to: 'b', type: 'depends_on' }),
      ])
    );
  });

  test('WorkflowRunner can be constructed from plain workflow config', () => {
    const runner = new WorkflowRunner({
      workflow: {
        id: 'sample',
        steps: [{ id: 'first', run: async () => 'done' }],
      },
    });

    expect(runner.workflow.id).toBe('sample');
    expect(runner.workflow.steps[0].id).toBe('first');
  });

  test('AgentWorkflowStep requires an agent', () => {
    expect(
      () =>
        new AgentWorkflowStep({
          id: 'missing-agent',
          prompt: 'hello',
        })
    ).toThrow('requires an agent');
  });

  test('ToolValidator rejects malformed schemas', () => {
    const validator = new ToolValidator();
    const malformedTool = {
      name: 'broken',
      parameters: {
        type: 'not-a-real-json-schema-type',
      },
    };

    expect(() => validator.validate(malformedTool, {})).toThrow();
  });

  test('Memory supports layered memory, semantic lookup, and clearing', async () => {
    const adapter = {
      embedChunks: jest.fn()
        .mockResolvedValueOnce([{ embedding: [1, 0] }])
        .mockResolvedValueOnce([{ embedding: [1, 0] }])
        .mockResolvedValueOnce([{ embedding: [1, 0] }])
        .mockResolvedValueOnce([{ embedding: [1, 0] }]),
    };
    const vectorStore = {
      upsert: jest.fn().mockResolvedValue({}),
      query: jest.fn().mockResolvedValue({
        matches: [{ id: 'fact-1', metadata: { fact: 'Lisbon is sunny', source: 'weather-db' }, score: 0.99 }],
      }),
      deleteAll: jest.fn().mockResolvedValue(undefined),
    };

    const memory = new Memory({ adapter, vectorStore });
    memory.storeConversation('hello', 'world');
    memory.setEntity('City', 'Lisbon');
    memory.setWorkingMemory('active_task', 'review roadmap');
    memory.setPolicy('approval_required', 'delete_customer_data');

    expect(memory.getContext()).toContain('User: hello');
    expect(memory.getEntity('city')).toBe('Lisbon');
    expect(memory.getProfile('city')).toBe('Lisbon');
    expect(memory.getWorkingMemory('active_task')).toBe('review roadmap');
    expect(memory.getPolicy('approval_required')).toBe('delete_customer_data');
    expect(memory.listWorkingMemory()).toEqual([
      expect.objectContaining({ key: 'active_task', value: 'review roadmap' }),
    ]);
    expect(memory.listPolicies()).toEqual([
      expect.objectContaining({ key: 'approval_required', value: 'delete_customer_data' }),
    ]);

    await memory.storeSemanticMemory('Lisbon is sunny');
    await expect(memory.searchSemanticMemory('weather')).resolves.toBe('Lisbon is sunny');
    await expect(memory.searchSemanticMemoryWithProvenance('weather')).resolves.toEqual([
      expect.objectContaining({
        id: 'fact-1',
        fact: 'Lisbon is sunny',
        metadata: expect.objectContaining({ source: 'weather-db' }),
      }),
    ]);
    await expect(memory.searchAll('weather')).resolves.toEqual([{ fact: 'Lisbon is sunny', score: 0.99 }]);
    await memory.clearAll();
    expect(memory.conversation).toEqual([]);
    expect(memory.entities).toEqual({});
    expect(memory.listWorkingMemory()).toEqual([]);
    expect(memory.listPolicies()).toEqual([]);
    expect(vectorStore.deleteAll).toHaveBeenCalled();
  });

  test('Memory supports backend hydration and compaction policies', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-store-'));
    const workingStore = new FileLayerStore({ filePath: path.join(tmpDir, 'working.json') });
    const profileStore = new InMemoryLayerStore();
    const policyStore = new InMemoryLayerStore();

    const memory = new Memory({
      stores: {
        working: workingStore,
        profile: profileStore,
        policy: policyStore,
      },
      policies: {
        conversationLimit: 1,
        workingLimit: 1,
      },
    });

    memory.storeConversation('u1', 'a1');
    memory.storeConversation('u2', 'a2');
    await memory.setWorkingMemory('task1', 'first');
    await memory.setWorkingMemory('task2', 'second');
    await memory.setProfile('role', 'manager');

    expect(memory.conversation).toHaveLength(1);
    expect(memory.getWorkingMemory('task1')).toBeNull();
    expect(memory.getWorkingMemory('task2')).toBe('second');

    const hydrated = await new Memory({
      stores: {
        working: workingStore,
        profile: profileStore,
        policy: policyStore,
      },
    }).hydrate();

    expect(hydrated.getWorkingMemory('task2')).toBe('second');
  });

  test('RetryManager retries until success', async () => {
    const retryManager = new RetryManager({ retries: 2, baseDelay: 1, maxDelay: 1 });
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValue('ok');

    await expect(retryManager.execute(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('RAG indexes, searches, queries, and deletes using the local store', async () => {
    const adapter = {
      embedChunks: jest.fn().mockResolvedValue([{ embedding: [1, 0, 0] }]),
      generateText: jest.fn().mockResolvedValue({ message: 'grounded answer' }),
    };
    const retriever = new VectorStoreRetriever({
      adapter,
      vectorStore: new LocalVectorStore(),
      topK: 5,
    });

    const rag = new RAG({
      adapter,
      vectorStore: retriever.vectorStore,
      retriever,
      chunkSize: 50,
      chunkOverlap: 10,
    });

    const insertedIds = await rag.index(['Lisbon is the capital of Portugal.']);
    expect(insertedIds).toHaveLength(1);

    const searchResults = await rag.search('Lisbon');
    expect(searchResults[0]).toContain('Lisbon');

    const provenance = await rag.searchWithProvenance('Lisbon');
    expect(provenance).toEqual(
      expect.objectContaining({
        query: 'Lisbon',
        matches: expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Lisbon'),
            score: expect.any(Number),
          }),
        ]),
      })
    );
    expect(provenance.matches[0]).toEqual(
      expect.objectContaining({
        normalizedScore: expect.any(Number),
      })
    );

    const reranked = await rag.searchWithProvenance('Lisbon', { rerank: 'lexical' });
    expect(reranked.matches[0]).toEqual(
      expect.objectContaining({
        rerankScore: expect.any(Number),
      })
    );

    const answer = await rag.query('What is Lisbon?');
    expect(answer).toEqual(
      expect.objectContaining({ message: 'grounded answer' })
    );
    expect(answer.retrieval).toEqual(
      expect.objectContaining({
        query: 'What is Lisbon?',
        matches: expect.any(Array),
      })
    );

    await expect(rag.delete({ ids: insertedIds })).resolves.toBeUndefined();
  });

  test('RAG chunking supports paragraph strategy and overlap', async () => {
    const rag = new RAG({
      adapter: { embedChunks: jest.fn() },
      retriever: { search: jest.fn() },
      chunkSize: 20,
      chunkOverlap: 5,
      chunkStrategy: 'paragraph',
    });

    const chunks = await rag.chunk('First paragraph.\n\nSecond paragraph is longer.', 20, {
      strategy: 'paragraph',
      overlap: 5,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toContain('First paragraph');
  });

  test('MCPClient delegates list/execute and converts discovered tools', async () => {
    const client = new MCPClient({ endpoint: 'ws://example.com' });
    client._send = jest.fn()
      .mockResolvedValueOnce({
        tools: [{ name: 'weather.search', description: 'Search weather', inputSchema: { type: 'object', properties: {} } }],
      })
      .mockResolvedValueOnce({ output: { forecast: 'sunny' } })
      .mockResolvedValueOnce({
        tools: [{ name: 'weather.search', description: 'Search weather', inputSchema: { type: 'object', properties: {} } }],
      })
      .mockResolvedValueOnce({ output: { forecast: 'sunny' } });

    await expect(client.listTools()).resolves.toHaveLength(1);
    await expect(client.execute('weather.search', { city: 'Lisbon' })).resolves.toEqual({ forecast: 'sunny' });

    const tools = await client.toTools();
    expect(tools[0].name).toBe('weather_search');
    await expect(tools[0].call({ city: 'Lisbon' })).resolves.toEqual({ forecast: 'sunny' });
  });

  test('OpenAPILoader builds tools from a JSON OpenAPI spec', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openapi-loader-'));
    const specPath = path.join(tmpDir, 'spec.json');

    fs.writeFileSync(specPath, JSON.stringify({
      openapi: '3.0.0',
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/weather/{city}': {
          get: {
            summary: 'Get weather',
            parameters: [
              { name: 'city', in: 'path', required: true, schema: { type: 'string' } },
            ],
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { forecast: { type: 'string' } } },
                  },
                },
              },
            },
          },
        },
      },
    }));

    const { tools } = OpenAPILoader.load(specPath, { serviceName: 'weather' });
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toContain('weather');
  });

  test('ApiLoader builds executable tools and routes params to fetch', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ forecast: 'sunny' }),
      text: async () => '',
    });

    const { tools } = ApiLoader.load({
      serviceName: 'weather',
      authToken: 'secret',
      apiSpec: {
        baseUrl: 'https://api.example.com',
        endpoints: {
          getWeather: {
            path: '/weather/{city}',
            method: 'GET',
            queryParams: {
              unit: { type: 'string' },
            },
            pathParams: {
              city: { type: 'string', required: true },
            },
            requiresAuth: true,
          },
        },
      },
    });

    const result = await tools[0].call({ city: 'Lisbon', unit: 'metric' });
    expect(result).toEqual({ status: 200, data: { forecast: 'sunny' } });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/weather/Lisbon?unit=metric',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
      })
    );
  });
});
