const { randomUUID } = require('crypto');
const { Run } = require('./Run');
const { EventBus } = require('./EventBus');
const { BaseRunStore } = require('./stores/BaseRunStore');
const { InMemoryRunStore } = require('./stores/InMemoryRunStore');

class PlanningRuntime {
  constructor({
    planner,
    executor,
    verifier = null,
    recovery = null,
    runStore = new InMemoryRunStore(),
    eventBus = null,
    onEvent = null,
    maxRecoveryAttempts = 1,
  } = {}) {
    if (typeof planner !== 'function') {
      throw new Error('PlanningRuntime requires a planner function.');
    }
    if (typeof executor !== 'function') {
      throw new Error('PlanningRuntime requires an executor function.');
    }

    this.planner = planner;
    this.executor = executor;
    this.verifier = verifier;
    this.recovery = recovery;
    this.runStore = BaseRunStore.assert(runStore, 'PlanningRuntime runStore');
    this.eventBus = eventBus instanceof EventBus ? eventBus : new EventBus(eventBus || {});
    this.onEvent = onEvent;
    this.maxRecoveryAttempts = maxRecoveryAttempts;
  }

  async _persist(run) {
    if (!this.runStore?.saveRun) {
      return run;
    }

    return this.runStore.saveRun(run);
  }

  async _emit(run, type, payload = {}) {
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
    await this._persist(run);
    return event;
  }

  async _checkpoint(run, label, payload = {}) {
    run.addCheckpoint({
      id: `${run.id}:checkpoint:${run.checkpoints.length + 1}`,
      label,
      timestamp: new Date().toISOString(),
      status: run.status,
      payload,
      snapshot: run.createCheckpointSnapshot(),
    });
    await this._persist(run);
  }

  async run(input, options = {}) {
    const run = new Run({
      id: options.runId || randomUUID(),
      input,
      state: {
        ...(options.state || {}),
        planning: {
          plan: null,
          verification: null,
          recoveries: [],
          attempts: 0,
        },
      },
      metadata: {
        planningRuntime: true,
        ...(options.metadata || {}),
      },
    });

    run.setStatus('running');
    await this._persist(run);
    await this._emit(run, 'planning_started', { input });
    await this._checkpoint(run, 'planning_started', { input });

    const context = {
      input,
      run,
      state: run.state,
      metadata: run.metadata,
    };

    try {
      const planningStep = run.addStep({
        id: `${run.id}:step:${run.steps.length + 1}`,
        type: 'planning',
        status: 'running',
        createdAt: new Date().toISOString(),
      });
      const plan = await this.planner(context);
      run.state.planning.plan = plan;
      run.updateStep(planningStep.id, { status: 'completed', output: plan });
      await this._emit(run, 'plan_created', { plan });
      await this._checkpoint(run, 'plan_created', {});

      const executeOnce = async planToExecute => {
        const executionStep = run.addStep({
          id: `${run.id}:step:${run.steps.length + 1}`,
          type: 'execution',
          status: 'running',
          createdAt: new Date().toISOString(),
        });
        try {
          const result = await this.executor({
            ...context,
            plan: planToExecute,
          });
          run.updateStep(executionStep.id, { status: 'completed', output: result });
          await this._emit(run, 'plan_executed', { result });
          await this._checkpoint(run, 'plan_executed', {});
          return result;
        } catch (error) {
          run.updateStep(executionStep.id, {
            status: 'failed',
            error: {
              name: error.name || 'Error',
              message: error.message || String(error),
            },
          });
          await this._emit(run, 'plan_execution_failed', {
            message: error.message || String(error),
          });
          await this._checkpoint(run, 'plan_execution_failed', {});
          throw error;
        }
      };

      const attemptRecovery = async ({ verification = null, error = null } = {}) => {
        if (typeof this.recovery !== 'function') {
          throw error || new Error('Planning recovery requested but no recovery handler is configured.');
        }
        if (run.state.planning.attempts >= this.maxRecoveryAttempts) {
          throw error || new Error('Planning recovery limit reached.');
        }

        const recoveryStep = run.addStep({
          id: `${run.id}:step:${run.steps.length + 1}`,
          type: 'recovery',
          status: 'running',
          createdAt: new Date().toISOString(),
        });
        const recoveryResult = await this.recovery({
          ...context,
          plan: run.state.planning.plan,
          result: run.output?.result || null,
          verification,
          error,
        });
        run.state.planning.recoveries.push(recoveryResult);
        run.state.planning.attempts += 1;
        run.updateStep(recoveryStep.id, { status: 'completed', output: recoveryResult });
        await this._emit(run, 'plan_recovered', { recovery: recoveryResult });
        await this._checkpoint(run, 'plan_recovered', {});
        const nextPlan = recoveryResult?.plan || run.state.planning.plan;
        run.state.planning.plan = nextPlan;
        return executeOnce(nextPlan);
      };

      let result;
      try {
        result = await executeOnce(plan);
      } catch (error) {
        result = await attemptRecovery({ error });
      }

      if (typeof this.verifier === 'function') {
        const verificationStep = run.addStep({
          id: `${run.id}:step:${run.steps.length + 1}`,
          type: 'verification',
          status: 'running',
          createdAt: new Date().toISOString(),
        });
        const verification = await this.verifier({
          ...context,
          plan: run.state.planning.plan,
          result,
        });
        run.state.planning.verification = verification;
        run.updateStep(verificationStep.id, { status: 'completed', output: verification });
        await this._emit(run, 'plan_verified', { verification });
        await this._checkpoint(run, 'plan_verified', {});

        const verdict = typeof verification === 'object' ? verification?.status : verification;
        if (verdict === false || verdict === 'failed' || verdict === 'recover') {
          result = await attemptRecovery({ verification });
        }
      }

      run.output = {
        plan: run.state.planning.plan,
        verification: run.state.planning.verification,
        recoveries: run.state.planning.recoveries,
        result,
      };
      run.setStatus('completed');
      await this._emit(run, 'planning_completed', { output: run.output });
      await this._checkpoint(run, 'planning_completed', {});
      await this._persist(run);
      return run;
    } catch (error) {
      run.addError({
        name: error.name || 'Error',
        message: error.message || String(error),
      });
      run.setStatus('failed');
      await this._emit(run, 'planning_failed', {
        message: error.message || String(error),
      });
      await this._checkpoint(run, 'planning_failed', {});
      await this._persist(run);
      throw error;
    }
  }
}

module.exports = { PlanningRuntime };
