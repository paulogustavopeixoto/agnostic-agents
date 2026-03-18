const { StateBundle } = require('./StateBundle');
const { StateRestorePlanner } = require('./StateRestorePlanner');
const { StateConsistencyChecker } = require('./StateConsistencyChecker');

class StateDurableRestoreSuite {
  constructor({ restorePlanner = null, consistencyChecker = null } = {}) {
    this.restorePlanner =
      restorePlanner instanceof StateRestorePlanner
        ? restorePlanner
        : new StateRestorePlanner(restorePlanner || {});
    this.consistencyChecker =
      consistencyChecker instanceof StateConsistencyChecker
        ? consistencyChecker
        : new StateConsistencyChecker(consistencyChecker || {});
  }

  build(bundle, { sourceEnvironment = 'unknown' } = {}) {
    const stateBundle = bundle instanceof StateBundle ? bundle : StateBundle.fromJSON(bundle || {});
    const consistency = this.consistencyChecker.check(stateBundle);
    const scenarios = ['process-worker', 'queue-worker', 'service-runtime'].map(targetEnvironment => {
      const plan = this.restorePlanner.buildPlan(stateBundle, {
        sourceEnvironment,
        targetEnvironment,
      });

      return {
        targetEnvironment,
        readyToRestore: plan.readyToRestore && consistency.valid,
        steps: [...plan.steps, ...this._buildDurabilitySteps(stateBundle, targetEnvironment, consistency)],
      };
    });

    return {
      sourceEnvironment,
      summary: stateBundle.summarize(),
      consistency,
      scenarios,
    };
  }

  _buildDurabilitySteps(bundle, targetEnvironment, consistency) {
    const run = bundle.run;
    const jobs = Array.isArray(bundle.metadata?.jobs) ? bundle.metadata.jobs : [];
    const workflowScoped =
      Boolean(run?.metadata?.workflowId) ||
      run?.pendingPause?.stage === 'workflow_replay' ||
      (run?.steps || []).some(step => step.type === 'workflow_step');
    const steps = [];
    const status = consistency.valid ? 'ready' : 'blocked';

    if (workflowScoped) {
      steps.push({
        action: 'restore_workflow_progress',
        required: true,
        status,
        reason: `Workflow-scoped state must be restored before continuing in "${targetEnvironment}".`,
      });
    }

    if (jobs.length) {
      steps.push({
        action: 'restore_scheduler_jobs',
        required: true,
        status,
        reason: `Restore ${jobs.length} persisted background job reference(s) before resuming durable execution.`,
      });
      steps.push({
        action: 'verify_scheduler_job_alignment',
        required: true,
        status,
        reason: 'Ensure restored job references still align with the resumed run state and target worker environment.',
      });
    }

    return steps;
  }
}

module.exports = { StateDurableRestoreSuite };
