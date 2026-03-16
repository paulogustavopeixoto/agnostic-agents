const { BaseRunStore } = require('./stores/BaseRunStore');
const { Run } = require('./Run');
const { DistributedRecoveryPlanner } = require('./DistributedRecoveryPlanner');

/**
 * Executes safe runtime recovery actions from a distributed recovery plan.
 */
class DistributedRecoveryRunner {
  /**
   * @param {object} options
   * @param {BaseRunStore} options.runStore
   * @param {object|null} [options.agentRuntime]
   * @param {object[]|object|null} [options.workflowRuntimes]
   * @param {boolean} [options.autoResumeBranch]
   */
  constructor({
    runStore,
    agentRuntime = null,
    workflowRuntimes = null,
    autoResumeBranch = true,
    approvalDecider = null,
  } = {}) {
    this.runStore = BaseRunStore.assert(runStore, 'DistributedRecoveryRunner runStore');
    this.planner = new DistributedRecoveryPlanner({ runStore: this.runStore });
    this.agentRuntime = agentRuntime || null;
    this.workflowRuntimes = Array.isArray(workflowRuntimes)
      ? workflowRuntimes
      : workflowRuntimes
        ? [workflowRuntimes]
        : [];
    this.autoResumeBranch = autoResumeBranch !== false;
    this.approvalDecider = typeof approvalDecider === 'function' ? approvalDecider : null;
  }

  async executePlan(
    planOrRunId,
    { compareToRunId = null, approvalReason = 'approved by recovery runner', approved = false } = {}
  ) {
    const plan =
      typeof planOrRunId === 'string'
        ? await this.planner.createPlan(planOrRunId, { compareToRunId })
        : planOrRunId;

    if (!plan?.runId) {
      throw new Error('DistributedRecoveryRunner requires a plan with runId.');
    }

    const storedRun = await this.runStore.getRun(plan.runId);
    if (!storedRun) {
      throw new Error(`Run "${plan.runId}" not found.`);
    }
    const run = storedRun instanceof Run ? storedRun : Run.fromJSON(storedRun);
    const runtime = this._resolveRuntime(run);

    const executableStep = (plan.steps || []).find(step =>
      ['resolve_approval', 'resume_replay', 'branch_from_failure_checkpoint', 'partial_replay'].includes(
        step.action
      )
    );

    if (!executableStep) {
      return {
        plan,
        executedAction: 'inspect_report',
        result: null,
      };
    }

    const approvalResolution = await this._resolveApproval(executableStep, plan, {
      approved,
      approvalReason,
    });
    if (!approvalResolution.approved) {
      return {
        plan,
        executedAction: 'waiting_for_recovery_approval',
        result: null,
        pendingApproval: {
          action: executableStep.action,
          runId: plan.runId,
          reason: approvalResolution.reason,
          incidentType: plan.incidentType || null,
          payload: executableStep.payload || {},
        },
      };
    }

    if (executableStep.action === 'resolve_approval') {
      const result = await runtime.resumeRun(plan.runId, {
        approved: true,
        reason: approvalReason,
      });
      return { plan, executedAction: executableStep.action, result };
    }

    if (executableStep.action === 'resume_replay') {
      const result = await runtime.resumeRun(plan.runId);
      return { plan, executedAction: executableStep.action, result };
    }

    if (
      executableStep.action === 'branch_from_failure_checkpoint' ||
      executableStep.action === 'workflow_branch_from_failure_checkpoint'
    ) {
      const branch = await runtime.branchRun(plan.runId, {
        checkpointId: executableStep.payload?.checkpointId || null,
        metadata: {
          recovery: {
            sourceRunId: plan.runId,
            action: executableStep.action,
            incidentType: plan.incidentType || null,
          },
        },
      });

      const result =
        this.autoResumeBranch && typeof runtime.resumeRun === 'function'
          ? await runtime.resumeRun(branch.id)
          : branch;
      return { plan, executedAction: executableStep.action, result };
    }

    if (executableStep.action === 'partial_replay') {
      const result = await runtime.replayRun(plan.runId, {
        checkpointId: executableStep.payload?.checkpointId || null,
        metadata: {
          recovery: {
            sourceRunId: plan.runId,
            action: executableStep.action,
          },
        },
      });
      return { plan, executedAction: executableStep.action, result };
    }

    return {
      plan,
      executedAction: 'inspect_report',
      result: null,
    };
  }

  _resolveRuntime(run) {
    if (run?.metadata?.workflowId) {
      const workflowRuntime = this.workflowRuntimes.find(
        candidate => candidate?.workflow?.id === run.metadata.workflowId
      );
      if (workflowRuntime) {
        return workflowRuntime;
      }
    }

    if (this.agentRuntime) {
      return this.agentRuntime;
    }

    throw new Error(
      `No recovery runtime is registered for run "${run?.id || 'unknown'}".`
    );
  }

  async _resolveApproval(step, plan, { approved = false, approvalReason = null } = {}) {
    if (!step.requiresApproval) {
      return { approved: true, reason: null };
    }
    if (approved === true) {
      return { approved: true, reason: approvalReason || 'approved explicitly' };
    }
    if (this.approvalDecider) {
      const resolution = await this.approvalDecider({
        step,
        plan,
      });
      if (resolution?.approved) {
        return {
          approved: true,
          reason: resolution.reason || approvalReason || 'approved by recovery approval decider',
        };
      }
      return {
        approved: false,
        reason: resolution?.reason || 'Recovery action requires explicit approval.',
      };
    }

    return {
      approved: false,
      reason: 'Recovery action requires explicit approval.',
    };
  }
}

module.exports = { DistributedRecoveryRunner };
