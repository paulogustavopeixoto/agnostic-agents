const { randomUUID } = require('crypto');
const { Run } = require('../Run');
const { EventBus } = require('../EventBus');
const { ConsoleDebugSink } = require('../ConsoleDebugSink');
const { RunInspector } = require('../RunInspector');
const { RetryManager } = require('../../utils/RetryManager');
const { InMemoryRunStore } = require('../stores/InMemoryRunStore');
const { Workflow } = require('./Workflow');
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
      };
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

    try {
      for (const step of this.workflow.steps) {
        if (workflowState.completedStepIds.includes(step.id)) {
          continue;
        }

        const missingDependency = step.dependsOn.find(
          dependency => !workflowState.completedStepIds.includes(dependency)
        );

        if (missingDependency) {
          throw new Error(
            `Workflow step "${step.id}" cannot run before dependency "${missingDependency}".`
          );
        }

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

  inspectRun(run) {
    return RunInspector.summarize(run);
  }
}

module.exports = { WorkflowRunner };
