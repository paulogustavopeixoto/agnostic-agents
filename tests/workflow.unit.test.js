const { Agent } = require('../src/agent/Agent');
const { Workflow } = require('../src/runtime/workflow/Workflow');
const { ExecutionGraph } = require('../src/runtime/workflow/ExecutionGraph');
const { DelegationContract } = require('../src/runtime/workflow/DelegationContract');
const { AgentWorkflowStep } = require('../src/runtime/workflow/AgentWorkflowStep');
const { WorkflowRunner } = require('../src/runtime/workflow/WorkflowRunner');
const { InMemoryRunStore } = require('../src/runtime/stores/InMemoryRunStore');

describe('Workflow runtime', () => {
  test('runs workflow steps in dependency order and stores results on the run', async () => {
    const execution = [];
    const workflow = new Workflow({
      id: 'daily-ops',
      steps: [
        {
          id: 'collect',
          run: async ({ input }) => {
            execution.push('collect');
            return { message: `collected:${input}` };
          },
        },
        {
          id: 'summarize',
          dependsOn: ['collect'],
          run: async ({ dependencyResults }) => {
            execution.push('summarize');
            return `summary:${dependencyResults.collect.message}`;
          },
        },
      ],
    });

    const runner = new WorkflowRunner({ workflow, runStore: new InMemoryRunStore() });
    const run = await runner.run('tickets');

    expect(run.status).toBe('completed');
    expect(execution).toEqual(['collect', 'summarize']);
    expect(run.output).toEqual({
      collect: { message: 'collected:tickets' },
      summarize: 'summary:collected:tickets',
    });
    expect(run.events.map(event => event.type)).toEqual(
      expect.arrayContaining([
        'workflow_started',
        'workflow_step_started',
        'workflow_step_completed',
        'workflow_completed',
      ])
    );
    expect(workflow.toExecutionGraph()).toBeInstanceOf(ExecutionGraph);
  });

  test('persists failed workflow runs and resumes remaining steps', async () => {
    const runStore = new InMemoryRunStore();
    let shouldFail = true;

    const workflow = new Workflow({
      id: 'resume-me',
      steps: [
        {
          id: 'first',
          run: async () => ({ ok: 1 }),
        },
        {
          id: 'second',
          dependsOn: ['first'],
          run: async ({ dependencyResults }) => {
            if (shouldFail) {
              shouldFail = false;
              throw new Error(`temporary:${dependencyResults.first.ok}`);
            }

            return { ok: 2 };
          },
        },
      ],
    });

    const runner = new WorkflowRunner({ workflow, runStore });
    await expect(runner.run('start')).rejects.toThrow('temporary:1');

    const [failedRun] = await runStore.listRuns();
    expect(failedRun.status).toBe('failed');
    expect(failedRun.state.workflow.completedStepIds).toEqual(['first']);

    const resumedRun = await runner.resumeRun(failedRun.id);
    expect(resumedRun.status).toBe('completed');
    expect(resumedRun.output).toEqual({
      first: { ok: 1 },
      second: { ok: 2 },
    });
    expect(resumedRun.checkpoints.map(checkpoint => checkpoint.label)).toEqual(
      expect.arrayContaining(['workflow_failed', 'workflow_resumed', 'workflow_completed'])
    );
  });

  test('records failed workflow steps on the run', async () => {
    const workflow = new Workflow({
      id: 'broken-workflow',
      steps: [
        {
          id: 'explode',
          run: async () => {
            throw new Error('boom');
          },
        },
      ],
    });

    const runStore = new InMemoryRunStore();
    const runner = new WorkflowRunner({ workflow, runStore });

    await expect(runner.run('x')).rejects.toThrow('boom');

    const [failedRun] = await runStore.listRuns();
    expect(failedRun.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'explode',
          type: 'workflow_step',
          status: 'failed',
        }),
      ])
    );
    expect(failedRun.events.map(event => event.type)).toEqual(
      expect.arrayContaining(['workflow_step_failed', 'workflow_failed'])
    );
  });

  test('pauses and resumes workflow runs outside approval flow', async () => {
    const runStore = new InMemoryRunStore();
    let shouldPause = true;
    const workflow = new Workflow({
      id: 'pause-flow',
      steps: [
        {
          id: 'collect',
          run: async ({ pause }) => {
            if (shouldPause) {
              shouldPause = false;
              await pause('waiting for external job', { checkpoint: 'collect' });
            }

            return { ok: true };
          },
        },
      ],
    });

    const runner = new WorkflowRunner({ workflow, runStore });
    const pausedRun = await runner.run('x');
    expect(pausedRun.status).toBe('paused');
    expect(pausedRun.pendingPause).toEqual(
      expect.objectContaining({
        reason: 'waiting for external job',
        stepId: 'collect',
      })
    );

    const resumedRun = await runner.resumeRun(pausedRun.id);
    expect(resumedRun.status).toBe('completed');
    expect(resumedRun.output).toEqual({ collect: { ok: true } });
    expect(resumedRun.events.map(event => event.type)).toEqual(
      expect.arrayContaining(['workflow_paused', 'workflow_resumed', 'workflow_completed'])
    );
  });

  test('can cancel a paused workflow run', async () => {
    const runStore = new InMemoryRunStore();
    const workflow = new Workflow({
      id: 'cancel-flow',
      steps: [
        {
          id: 'hold',
          run: async ({ pause }) => pause('stop here'),
        },
      ],
    });

    const runner = new WorkflowRunner({ workflow, runStore });
    const pausedRun = await runner.run('x');
    const cancelledRun = await runner.cancelRun(pausedRun.id, { reason: 'aborted' });

    expect(cancelledRun.status).toBe('cancelled');
    expect(cancelledRun.events.map(event => event.type)).toContain('workflow_cancelled');
    expect(runner.inspectRun(cancelledRun)).toEqual(
      expect.objectContaining({ status: 'cancelled' })
    );
  });

  test('runs agent-backed workflow steps and emits handoff events', async () => {
    const agent = new Agent({
      generateText: async messages => ({
        message: `agent:${messages[messages.length - 1].content}`,
        usage: { prompt: 10, completion: 5, total: 15 },
        cost: 0.01,
      }),
    });

    const workflow = new Workflow({
      id: 'worker-handoff',
      steps: [
        new AgentWorkflowStep({
          id: 'research',
          agent,
          assignee: 'researcher',
          prompt: ({ input }) => `Research ${input}`,
        }),
        new AgentWorkflowStep({
          id: 'write',
          agent,
          assignee: 'writer',
          dependsOn: ['research'],
          handoff: {
            from: 'researcher',
            to: 'writer',
            reason: 'turn findings into draft',
          },
          prompt: ({ dependencyResults }) =>
            `Write from ${dependencyResults.research.output}`,
        }),
      ],
    });

    const runStore = new InMemoryRunStore();
    const runner = new WorkflowRunner({ workflow, runStore });
    const run = await runner.run('roadmap');

    expect(run.status).toBe('completed');
    expect(run.output.research).toEqual(
      expect.objectContaining({
        output: 'agent:Research roadmap',
      })
    );
    expect(run.output.write).toEqual(
      expect.objectContaining({
        output: 'agent:Write from agent:Research roadmap',
      })
    );
    expect(run.events.map(event => event.type)).toEqual(
      expect.arrayContaining(['agent_step_started', 'agent_step_completed', 'agent_handoff'])
    );
    expect(run.metadata.lineage.childRunIds).toHaveLength(2);
    expect(run.metrics.childRuns.count).toBe(2);
    expect(run.metrics.tokenUsage.total).toBe(30);
    expect(run.metrics.cost).toBeCloseTo(0.02);
    expect(run.output.research).toEqual(
      expect.objectContaining({
        agentRunId: expect.any(String),
        metrics: expect.objectContaining({
          tokenUsage: expect.objectContaining({ total: 15 }),
        }),
      })
    );
  });

  test('can branch a workflow run from a checkpoint and resume the branch', async () => {
    const runStore = new InMemoryRunStore();
    const workflow = new Workflow({
      id: 'branch-flow',
      steps: [
        {
          id: 'collect',
          run: async ({ input }) => ({ input }),
        },
      ],
    });

    const runner = new WorkflowRunner({ workflow, runStore });
    const originalRun = await runner.run('alpha');
    const branchedRun = await runner.branchRun(originalRun.id);

    expect(branchedRun.status).toBe('paused');
    expect(branchedRun.metadata.lineage).toEqual(
      expect.objectContaining({
        rootRunId: originalRun.id,
        branchOriginRunId: originalRun.id,
        branchCheckpointId: originalRun.checkpoints[originalRun.checkpoints.length - 1].id,
      })
    );
    expect(branchedRun.events.map(event => event.type)).toContain('workflow_branched');

    const resumedRun = await runner.resumeRun(branchedRun.id);
    expect(resumedRun.status).toBe('completed');
    expect(resumedRun.output).toEqual({ collect: { input: 'alpha' } });
  });

  test('can replay a workflow run from a frozen trace', async () => {
    const runStore = new InMemoryRunStore();
    const workflow = new Workflow({
      id: 'replay-flow',
      steps: [
        {
          id: 'collect',
          run: async ({ input }) => ({ input }),
        },
      ],
    });

    const runner = new WorkflowRunner({ workflow, runStore });
    const sourceRun = await runner.run('beta');
    const replayRun = await runner.replayRun(sourceRun.id);

    expect(replayRun.id).not.toBe(sourceRun.id);
    expect(replayRun.status).toBe(sourceRun.status);
    expect(replayRun.output).toEqual(sourceRun.output);
    expect(replayRun.events.map(event => event.type)).toEqual(
      expect.arrayContaining(['workflow_replay_started', 'workflow_replay_completed'])
    );
    expect(replayRun.metadata.replay).toEqual(
      expect.objectContaining({
        mode: 'frozen_trace',
        sourceRunId: sourceRun.id,
      })
    );
  });

  test('can partially replay a workflow run from a checkpoint snapshot', async () => {
    const runStore = new InMemoryRunStore();
    const workflow = new Workflow({
      id: 'partial-replay-flow',
      steps: [
        {
          id: 'collect',
          run: async ({ input }) => ({ input }),
        },
      ],
    });

    const runner = new WorkflowRunner({ workflow, runStore });
    const sourceRun = await runner.run('gamma');
    const checkpointId = sourceRun.checkpoints[sourceRun.checkpoints.length - 1].id;
    const replayRun = await runner.replayRun(sourceRun.id, { checkpointId });

    expect(replayRun.id).not.toBe(sourceRun.id);
    expect(replayRun.metadata.replay).toEqual(
      expect.objectContaining({
        mode: 'partial_frozen_trace',
        sourceRunId: sourceRun.id,
        sourceCheckpointId: checkpointId,
      })
    );
    expect(replayRun.events.map(event => event.type)).toEqual(
      expect.arrayContaining(['workflow_replay_started', 'workflow_replay_completed'])
    );
    expect(replayRun.status).toBe('paused');
    expect(replayRun.pendingPause).toEqual(
      expect.objectContaining({
        stage: 'workflow_replay',
        sourceRunId: sourceRun.id,
        sourceCheckpointId: checkpointId,
      })
    );
  });

  test('can create and continue a distributed workflow replay envelope', async () => {
    const runStore = new InMemoryRunStore();
    const workflow = new Workflow({
      id: 'distributed-replay-flow',
      steps: [
        {
          id: 'collect',
          run: async ({ input }) => ({ input }),
        },
      ],
    });

    const runner = new WorkflowRunner({ workflow, runStore });
    const sourceRun = await runner.run('delta');
    const checkpointId = sourceRun.checkpoints[sourceRun.checkpoints.length - 1].id;
    const envelope = await runner.createDistributedEnvelope(sourceRun.id, {
      action: 'replay',
      checkpointId,
      metadata: { destination: 'workflow-worker-b' },
    });
    const replayRun = await runner.continueDistributedRun(envelope);

    expect(envelope).toEqual(
      expect.objectContaining({
        runtimeKind: 'workflow',
        action: 'replay',
        runId: sourceRun.id,
        checkpointId,
        metadata: expect.objectContaining({
          workflowId: 'distributed-replay-flow',
          destination: 'workflow-worker-b',
          sourceRunId: sourceRun.id,
        }),
      })
    );
    expect(replayRun.metadata.replay).toEqual(
      expect.objectContaining({
        mode: 'partial_frozen_trace',
        sourceRunId: sourceRun.id,
        sourceCheckpointId: checkpointId,
      })
    );
    expect(replayRun.status).toBe('paused');
    expect(replayRun.pendingPause).toEqual(
      expect.objectContaining({
        stage: 'workflow_replay',
        sourceRunId: sourceRun.id,
        sourceCheckpointId: checkpointId,
      })
    );
  });

  test('workflow runs propagate execution identity into distributed envelopes', async () => {
    const runStore = new InMemoryRunStore();
    const workflow = new Workflow({
      id: 'workflow-identity-flow',
      steps: [
        {
          id: 'collect',
          run: async ({ input }) => ({ input }),
        },
      ],
    });

    const runner = new WorkflowRunner({
      workflow,
      runStore,
      executionIdentity: {
        actorId: 'scheduler-1',
        serviceId: 'workflow-service',
        scopes: ['workflow:run'],
      },
    });

    const run = await runner.run('identity aware workflow');
    const envelope = await runner.createDistributedEnvelope(run.id, { action: 'replay' });

    expect(run.metadata.executionIdentity).toEqual({
      actorId: 'scheduler-1',
      serviceId: 'workflow-service',
      tenantId: null,
      sessionId: null,
      scopes: ['workflow:run'],
    });
    expect(envelope.metadata.executionIdentity).toEqual({
      actorId: 'scheduler-1',
      serviceId: 'workflow-service',
      tenantId: null,
      sessionId: null,
      scopes: ['workflow:run'],
    });
  });

  test('supports explicit delegation contracts for agent-backed steps', async () => {
    const adapter = {
      getCapabilities: () => ({ generateText: true, toolCalling: true }),
      generateText: async messages => ({
        message: `agent:${messages[messages.length - 1].content}`,
      }),
    };
    const agent = new Agent(adapter);

    const contract = new DelegationContract({
      id: 'research-contract',
      assignee: 'researcher',
      requiredInputs: ['prompt'],
      outputValidator: ({ output }) => typeof output === 'string' && output.startsWith('agent:'),
    });

    const workflow = new Workflow({
      id: 'delegation-flow',
      steps: [
        new AgentWorkflowStep({
          id: 'research',
          agent,
          assignee: 'researcher',
          prompt: 'Research the roadmap',
          delegationContract: contract,
        }),
      ],
    });

    const runner = new WorkflowRunner({ workflow, runStore: new InMemoryRunStore() });
    const run = await runner.run('roadmap');

    expect(run.status).toBe('completed');
    expect(run.events.map(event => event.type)).toEqual(
      expect.arrayContaining(['delegation_requested', 'delegation_completed'])
    );
  });

  test('rejects delegation when the contract requires unsupported capabilities', async () => {
    const adapter = {
      getCapabilities: () => ({ generateText: true, toolCalling: false }),
      generateText: async messages => ({
        message: `agent:${messages[messages.length - 1].content}`,
      }),
    };
    const agent = new Agent(adapter);

    const workflow = new Workflow({
      id: 'delegation-error-flow',
      steps: [
        new AgentWorkflowStep({
          id: 'delegate',
          agent,
          prompt: 'Do the thing',
          delegationContract: {
            id: 'requires-tools',
            requiredCapabilities: ['toolCalling'],
          },
        }),
      ],
    });

    const runner = new WorkflowRunner({ workflow, runStore: new InMemoryRunStore() });
    await expect(runner.run('x')).rejects.toThrow('requires capability "toolCalling"');
  });

  test('runs compensation hooks when a later workflow step fails', async () => {
    const compensations = [];
    const workflow = new Workflow({
      id: 'comp-flow',
      steps: [
        {
          id: 'provision',
          run: async () => ({ resourceId: 'r1' }),
          compensate: async ({ result }) => {
            compensations.push(result.resourceId);
            return { reverted: result.resourceId };
          },
        },
        {
          id: 'explode',
          dependsOn: ['provision'],
          run: async () => {
            throw new Error('later failure');
          },
        },
      ],
    });

    const runner = new WorkflowRunner({ workflow, runStore: new InMemoryRunStore() });
    await expect(runner.run('x')).rejects.toThrow('later failure');
    expect(compensations).toEqual(['r1']);
  });
});
