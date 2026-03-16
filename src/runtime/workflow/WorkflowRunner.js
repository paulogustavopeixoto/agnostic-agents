const { randomUUID } = require('crypto');
const { Run } = require('../Run');
const { EventBus } = require('../EventBus');
const { ConsoleDebugSink } = require('../ConsoleDebugSink');
const { RunInspector } = require('../RunInspector');
const { RetryManager } = require('../../utils/RetryManager');
const { InMemoryRunStore } = require('../stores/InMemoryRunStore');
const { Workflow } = require('./Workflow');
const { ExecutionGraph } = require('./ExecutionGraph');
const { RunNotFoundError, RunCancelledError } = require('../../errors');

class WorkflowPauseSignal extends Error {
  constructor(reason, payload = {}) {
    super(reason || 'Workflow paused.');
    this.name = 'WorkflowPauseSignal';
    this.reason = reason || 'Workflow paused.';
    this.payload = payload;
  }
}

class WorkflowRunner {
  constructor({
    workflow,
    runStore = new InMemoryRunStore(),
    retryManager = new RetryManager({ retries: 0, baseDelay: 1, maxDelay: 1 }),
    eventBus = null,
    onEvent = null,
    debug = false,
  } = {}) {
    this.workflow = workflow instanceof Workflow ? workflow : new Workflow(workflow || {});
    this.runStore = runStore;
    this.retryManager = retryManager;
    this.eventBus = eventBus instanceof EventBus ? eventBus : new EventBus(eventBus || {});
    if (debug) {
      this.eventBus.addSink(new ConsoleDebugSink());
    }
    this.onEvent = onEvent;
    this.debug = debug;
  }

  async _persistRun(run) {
    if (!this.runStore?.saveRun) {
      return run;
    }

    return this.runStore.saveRun(run);
  }

  async _emitEvent(run, type, payload = {}) {
    const event = {
      id: `${run.id}:${run.events.length + 1}`,
      type,
      timestamp: new Date().toISOString(),
      payload,
    };

    run.addEvent(event);

    if (typeof this.onEvent === 'function') {
      await this.onEvent(event, run);
    }

    await this.eventBus.emit(event, run);
    await this._persistRun(run);
    return event;
  }

  async _checkpointRun(run, label, payload = {}) {
    run.addCheckpoint({
      id: `${run.id}:checkpoint:${run.checkpoints.length + 1}`,
      label,
      timestamp: new Date().toISOString(),
      status: run.status,
      payload,
      snapshot: run.createCheckpointSnapshot(),
      workflowId: this.workflow.id,
      completedSteps: Object.keys(run.state.workflow?.results || {}),
    });
    await this._persistRun(run);
  }

  async _pauseRun(run, reason, payload = {}) {
    run.pendingPause = {
      reason,
      ...payload,
    };
    run.setStatus('paused');
    await this._emitEvent(run, 'workflow_paused', {
      workflowId: this.workflow.id,
      reason,
      ...payload,
    });
    await this._checkpointRun(run, 'workflow_paused', {
      workflowId: this.workflow.id,
      reason,
      ...payload,
    });
    await this._persistRun(run);
    return run;
  }

  async _cancelRun(run, reason = 'Cancelled manually.', payload = {}) {
    run.pendingPause = null;
    run.setStatus('cancelled');
    await this._emitEvent(run, 'workflow_cancelled', {
      workflowId: this.workflow.id,
      reason,
      ...payload,
    });
    await this._checkpointRun(run, 'workflow_cancelled', {
      workflowId: this.workflow.id,
      reason,
      ...payload,
    });
    await this._persistRun(run);
    return run;
  }

  _getWorkflowState(run) {
    if (!run.state.workflow) {
      run.state.workflow = {
        workflowId: this.workflow.id,
        results: {},
        completedStepIds: [],
        compensations: [],
      };
    }

    if (!Array.isArray(run.state.workflow.compensations)) {
      run.state.workflow.compensations = [];
    }

    return run.state.workflow;
  }

  _startStep(run, step) {
    return run.addStep({
      id: `${run.id}:workflow-step:${step.id}:${run.steps.length + 1}`,
      key: step.id,
      type: 'workflow_step',
      status: 'running',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      payload: {
        workflowId: this.workflow.id,
        stepId: step.id,
        dependsOn: step.dependsOn,
      },
      output: null,
      error: null,
    });
  }

  async run(input, options = {}) {
    const run = new Run({
      id: options.runId || randomUUID(),
      input,
      state: {
        ...(options.state || {}),
        workflow: {
          workflowId: this.workflow.id,
          results: { ...(options.results || {}) },
          completedStepIds: [...(options.completedStepIds || [])],
        },
      },
      metadata: {
        workflowId: this.workflow.id,
        workflowName: this.workflow.name,
        ...(options.metadata || {}),
        lineage: {
          rootRunId:
            options.lineage?.rootRunId ||
            options.metadata?.lineage?.rootRunId ||
            options.lineage?.parentRunId ||
            options.metadata?.lineage?.parentRunId ||
            undefined,
          parentRunId: options.lineage?.parentRunId || options.metadata?.lineage?.parentRunId || null,
          childRunIds: options.lineage?.childRunIds || options.metadata?.lineage?.childRunIds || [],
          branchOriginRunId:
            options.lineage?.branchOriginRunId || options.metadata?.lineage?.branchOriginRunId || null,
          branchCheckpointId:
            options.lineage?.branchCheckpointId || options.metadata?.lineage?.branchCheckpointId || null,
        },
      },
    });

    run.setStatus('running');
    await this._persistRun(run);
    await this._emitEvent(run, 'workflow_started', {
      workflowId: this.workflow.id,
      input,
    });
    await this._checkpointRun(run, 'workflow_started', { workflowId: this.workflow.id });

    return this._continue(run);
  }

  async resumeRun(runId) {
    if (!this.runStore?.getRun) {
      throw new RunNotFoundError('Cannot resume a workflow run without a configured runStore.');
    }

    const storedRun = await this.runStore.getRun(runId);
    if (!storedRun) {
      throw new RunNotFoundError(`Run "${runId}" not found.`);
    }

    const run = storedRun instanceof Run ? storedRun : Run.fromJSON(storedRun);
    const workflowState = this._getWorkflowState(run);

    if (workflowState.workflowId !== this.workflow.id) {
      throw new Error(
        `Run "${runId}" belongs to workflow "${workflowState.workflowId}", not "${this.workflow.id}".`
      );
    }

    if (run.status === 'completed') {
      return run;
    }
    if (run.status === 'cancelled') {
      throw new RunCancelledError(`Run "${runId}" has been cancelled.`);
    }

    run.setStatus('running');
    const resumeType = run.pendingPause ? 'workflow_resumed' : 'workflow_resumed';
    const previousPause = run.pendingPause;
    run.pendingPause = null;
    await this._emitEvent(run, resumeType, {
      workflowId: this.workflow.id,
      completedStepIds: workflowState.completedStepIds,
      reason: previousPause?.reason || null,
    });
    await this._checkpointRun(run, 'workflow_resumed', {
      workflowId: this.workflow.id,
      reason: previousPause?.reason || null,
    });

    return this._continue(run);
  }

  async _continue(run) {
    const workflowState = this._getWorkflowState(run);
    const graph = this.workflow.toExecutionGraph();

    try {
      while (workflowState.completedStepIds.length < this.workflow.steps.length) {
        const readyNodes = graph.getReadyNodes(workflowState.completedStepIds);
        if (!readyNodes.length) {
          throw new Error(`Workflow "${this.workflow.id}" has no executable ready steps.`);
        }

        const nextNode = readyNodes[0];
        const step = this.workflow.getStep(nextNode.id);

        const stepRecord = this._startStep(run, step);
        await this._emitEvent(run, 'workflow_step_started', {
          workflowId: this.workflow.id,
          stepId: step.id,
        });

        const stepContext = {
          input: run.input,
          state: run.state,
          workflow: this.workflow,
          run,
          step,
          results: { ...workflowState.results },
          dependencyResults: step.dependsOn.reduce((acc, dependency) => {
            acc[dependency] = workflowState.results[dependency];
            return acc;
          }, {}),
          emitEvent: async (type, payload = {}) =>
            this._emitEvent(run, type, {
              workflowId: this.workflow.id,
              stepId: step.id,
              ...payload,
            }),
          checkpoint: async (label, payload = {}) =>
            this._checkpointRun(run, label, {
              workflowId: this.workflow.id,
              stepId: step.id,
              ...payload,
            }),
          pause: async (reason, payload = {}) => {
            throw new WorkflowPauseSignal(reason, {
              workflowId: this.workflow.id,
              stepId: step.id,
              ...payload,
            });
          },
        };

        try {
          const startedAt = Date.now();
          const result = await this.retryManager.execute(() => step.run(stepContext));
          run.recordTiming('workflowMs', Date.now() - startedAt);
          workflowState.results[step.id] = result;
          workflowState.completedStepIds.push(step.id);
          run.updateStep(stepRecord.id, {
            status: 'completed',
            output: result,
          });

          await this._emitEvent(run, 'workflow_step_completed', {
            workflowId: this.workflow.id,
            stepId: step.id,
            result,
          });
          await this._checkpointRun(run, 'workflow_step_completed', {
            workflowId: this.workflow.id,
            stepId: step.id,
          });
        } catch (error) {
          if (error instanceof WorkflowPauseSignal) {
            run.updateStep(stepRecord.id, {
              status: 'paused',
              output: null,
              error: null,
            });
            return this._pauseRun(run, error.reason, error.payload);
          }

          await this._runCompensations(run, step, workflowState);

          run.updateStep(stepRecord.id, {
            status: 'failed',
            error: {
              name: error.name || 'Error',
              message: error.message || String(error),
            },
          });
          run.addError({
            name: error.name || 'Error',
            message: error.message || String(error),
            stepId: step.id,
          });
          run.setStatus('failed');

          await this._emitEvent(run, 'workflow_step_failed', {
            workflowId: this.workflow.id,
            stepId: step.id,
            message: error.message || String(error),
          });
          await this._emitEvent(run, 'workflow_failed', {
            workflowId: this.workflow.id,
            stepId: step.id,
            message: error.message || String(error),
          });
          await this._checkpointRun(run, 'workflow_failed', {
            workflowId: this.workflow.id,
            stepId: step.id,
          });
          await this._persistRun(run);
          throw error;
        }
      }

      run.output = workflowState.results;
      run.setStatus('completed');
      await this._emitEvent(run, 'workflow_completed', {
        workflowId: this.workflow.id,
        results: workflowState.results,
      });
      await this._checkpointRun(run, 'workflow_completed', {
        workflowId: this.workflow.id,
      });
      await this._persistRun(run);
      return run;
    } catch (error) {
      throw error;
    }
  }

  async _runCompensations(run, failedStep, workflowState) {
    const completedSteps = [...workflowState.completedStepIds]
      .map(stepId => this.workflow.getStep(stepId))
      .filter(Boolean)
      .reverse();

    for (const step of completedSteps) {
      if (typeof step.compensate !== 'function') {
        continue;
      }

      const result = workflowState.results[step.id];
      const compensationResult = await step.compensate({
        run,
        workflow: this.workflow,
        step,
        result,
        failedStep,
        results: { ...workflowState.results },
      });

      workflowState.compensations.push({
        stepId: step.id,
        compensationResult,
      });
      await this._emitEvent(run, 'workflow_compensation_completed', {
        workflowId: this.workflow.id,
        stepId: step.id,
        failedStepId: failedStep.id,
        compensationResult,
      });
      await this._checkpointRun(run, 'workflow_compensation_completed', {
        workflowId: this.workflow.id,
        stepId: step.id,
        failedStepId: failedStep.id,
      });
    }
  }

  async cancelRun(runId, { reason = 'Cancelled manually.', payload = {} } = {}) {
    if (!this.runStore?.getRun) {
      throw new RunNotFoundError('Cannot cancel a workflow run without a configured runStore.');
    }

    const storedRun = await this.runStore.getRun(runId);
    if (!storedRun) {
      throw new RunNotFoundError(`Run "${runId}" not found.`);
    }

    const run = storedRun instanceof Run ? storedRun : Run.fromJSON(storedRun);
    if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
      return run;
    }

    return this._cancelRun(run, reason, payload);
  }

  async branchRun(
    runId,
    { checkpointId = null, input = null, metadata = {}, persist = true } = {}
  ) {
    if (!this.runStore?.getRun) {
      throw new RunNotFoundError('Cannot branch a workflow run without a configured runStore.');
    }

    const storedRun = await this.runStore.getRun(runId);
    if (!storedRun) {
      throw new RunNotFoundError(`Run "${runId}" not found.`);
    }

    const sourceRun = storedRun instanceof Run ? storedRun : Run.fromJSON(storedRun);
    const branchedRun = sourceRun.branchFromCheckpoint(checkpointId, {
      input: input ?? sourceRun.input,
      metadata: {
        workflowId: this.workflow.id,
        workflowName: this.workflow.name,
        ...metadata,
      },
    });

    await this._emitEvent(branchedRun, 'workflow_branched', {
      workflowId: this.workflow.id,
      sourceRunId: sourceRun.id,
      sourceCheckpointId: branchedRun.metadata.lineage.branchCheckpointId,
    });
    await this._checkpointRun(branchedRun, 'workflow_branched', {
      workflowId: this.workflow.id,
      sourceRunId: sourceRun.id,
      sourceCheckpointId: branchedRun.metadata.lineage.branchCheckpointId,
    });

    if (persist) {
      await this._persistRun(branchedRun);
    }

    return branchedRun;
  }

  async replayRun(
    runId,
    { persist = true, metadata = {}, replayRunId = null, checkpointId = null } = {}
  ) {
    if (!this.runStore?.getRun) {
      throw new RunNotFoundError('Cannot replay a workflow run without a configured runStore.');
    }

    const storedRun = await this.runStore.getRun(runId);
    if (!storedRun) {
      throw new RunNotFoundError(`Run "${runId}" not found.`);
    }

    const sourceRun = storedRun instanceof Run ? storedRun : Run.fromJSON(storedRun);
    const replayRun =
      checkpointId
        ? sourceRun.branchFromCheckpoint(checkpointId, {
            id: replayRunId || `${sourceRun.id}:partial-replay:${Date.now()}`,
            metadata: {
              workflowId: this.workflow.id,
              workflowName: this.workflow.name,
              ...metadata,
            },
          })
        : Run.fromJSON(sourceRun.toJSON());
    replayRun.id =
      replayRunId ||
      replayRun.id ||
      `${sourceRun.id}:${checkpointId ? 'partial-replay' : 'replay'}:${Date.now()}`;
    if (!checkpointId) {
      replayRun.id = replayRunId || `${sourceRun.id}:replay:${Date.now()}`;
    }
    replayRun.metadata = {
      ...replayRun.metadata,
      ...metadata,
      replay: {
        mode: checkpointId ? 'partial_frozen_trace' : 'frozen_trace',
        sourceRunId: sourceRun.id,
        sourceCheckpointId: checkpointId || null,
        replayedAt: new Date().toISOString(),
      },
      lineage: {
        ...replayRun.metadata.lineage,
        rootRunId: sourceRun.metadata?.lineage?.rootRunId || sourceRun.id,
        parentRunId: null,
        childRunIds: [],
      },
    };
    replayRun.events = [];
    replayRun.checkpoints = [];
    replayRun.timestamps = {
      createdAt: new Date().toISOString(),
      startedAt: null,
      updatedAt: new Date().toISOString(),
      completedAt: null,
      failedAt: null,
      cancelledAt: null,
    };
    replayRun.pendingApproval = null;
    replayRun.pendingPause = null;

    replayRun.setStatus('running');
    await this._emitEvent(replayRun, 'workflow_replay_started', {
      workflowId: this.workflow.id,
      sourceRunId: sourceRun.id,
      sourceCheckpointId: checkpointId || null,
      mode: checkpointId ? 'partial_frozen_trace' : 'frozen_trace',
    });
    await this._checkpointRun(replayRun, 'workflow_replay_started', {
      workflowId: this.workflow.id,
      sourceRunId: sourceRun.id,
      sourceCheckpointId: checkpointId || null,
      mode: checkpointId ? 'partial_frozen_trace' : 'frozen_trace',
    });

    if (!checkpointId) {
      replayRun.output = sourceRun.output;
      replayRun.state = JSON.parse(JSON.stringify(sourceRun.state || {}));
      replayRun.messages = JSON.parse(JSON.stringify(sourceRun.messages || []));
      replayRun.steps = JSON.parse(JSON.stringify(sourceRun.steps || []));
      replayRun.toolCalls = JSON.parse(JSON.stringify(sourceRun.toolCalls || []));
      replayRun.toolResults = JSON.parse(JSON.stringify(sourceRun.toolResults || []));
      replayRun.metrics = JSON.parse(JSON.stringify(sourceRun.metrics || replayRun.metrics));
      replayRun.errors = JSON.parse(JSON.stringify(sourceRun.errors || []));
      replayRun.setStatus(sourceRun.status);
    }

    await this._emitEvent(replayRun, 'workflow_replay_completed', {
      workflowId: this.workflow.id,
      sourceRunId: sourceRun.id,
      sourceCheckpointId: checkpointId || null,
      status: checkpointId ? replayRun.status : sourceRun.status,
    });
    await this._checkpointRun(replayRun, 'workflow_replay_completed', {
      workflowId: this.workflow.id,
      sourceRunId: sourceRun.id,
      sourceCheckpointId: checkpointId || null,
      status: checkpointId ? replayRun.status : sourceRun.status,
    });

    if (persist) {
      await this._persistRun(replayRun);
    }

    return replayRun;
  }

  inspectRun(run) {
    return RunInspector.summarize(run);
  }
}

module.exports = { WorkflowRunner };
