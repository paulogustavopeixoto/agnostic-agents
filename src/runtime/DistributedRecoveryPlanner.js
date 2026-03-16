const { IncidentDebugger } = require('./IncidentDebugger');
const { BaseRunStore } = require('./stores/BaseRunStore');

/**
 * Builds structured operator recovery plans for distributed runs using the
 * same durable state consumed by IncidentDebugger.
 */
class DistributedRecoveryPlanner {
  /**
   * @param {object} options
   * @param {BaseRunStore} options.runStore
   */
  constructor({ runStore } = {}) {
    this.runStore = BaseRunStore.assert(runStore, 'DistributedRecoveryPlanner runStore');
    this.incidentDebugger = new IncidentDebugger({ runStore: this.runStore });
  }

  /**
   * Creates a recovery plan for a failed, paused, or approval-gated run.
   *
   * @param {string} runId
   * @param {object} [options]
   * @param {string|null} [options.compareToRunId]
   * @returns {Promise<object>}
   */
  async createPlan(runId, { compareToRunId = null } = {}) {
    const report = await this.incidentDebugger.createReport(runId, { compareToRunId });
    const incidentType = this._classifyIncidentType(report);
    const recoveryPolicy = this._buildRecoveryPolicy(report, incidentType);
    const steps = [];

    if (report.pendingApproval) {
      steps.push({
        action: 'resolve_approval',
        priority: 'high',
        reason: 'Run is blocked on approval.',
        runId: report.runId,
        payload: {
          toolName: report.pendingApproval.toolName || null,
          toolCallId: report.pendingApproval.toolCall?.id || null,
        },
        requiresApproval: false,
      });
    }

    if (
      report.status === 'paused' &&
      (report.pendingPause?.stage === 'replay' || report.pendingPause?.stage === 'workflow_replay')
    ) {
      steps.push({
        action: 'resume_replay',
        priority: 'high',
        reason: 'Run is paused in replay mode and can be resumed from persisted state.',
        runId: report.runId,
        payload: {
          sourceRunId: report.pendingPause.sourceRunId || null,
          sourceCheckpointId: report.pendingPause.sourceCheckpointId || null,
        },
        requiresApproval: false,
      });
    }

    if (report.failedSteps?.length) {
      const failedStep = report.failedSteps[report.failedSteps.length - 1];
      const useWorkflowScopedRecovery = recoveryPolicy.prefersWorkflowScopedRecovery === true;
      steps.push({
        action:
          useWorkflowScopedRecovery
            ? 'workflow_branch_from_failure_checkpoint'
            : 'branch_from_failure_checkpoint',
        priority: 'high',
        reason:
          useWorkflowScopedRecovery
            ? 'Branch the workflow recovery path from the failure boundary before retrying distributed work.'
            : 'Branch from the failure boundary before retrying distributed work.',
        runId: report.runId,
        payload: {
          failedStepId: failedStep.id,
          checkpointId: report.lastCheckpoint?.id || null,
        },
        requiresApproval: recoveryPolicy.requiresApprovalForBranch === true,
      });
    } else if (report.lastCheckpoint?.id) {
      steps.push({
        action: 'partial_replay',
        priority: 'medium',
        reason: 'Use the most recent checkpoint for deterministic inspection.',
        runId: report.runId,
        payload: {
          checkpointId: report.lastCheckpoint.id,
        },
        requiresApproval: false,
      });
    }

    if (report.comparison?.statusChanged || report.comparison?.outputChanged) {
      steps.push({
        action: 'compare_to_known_good',
        priority: 'medium',
        reason: 'Trace comparison shows a material divergence from the comparison run.',
        runId: report.runId,
        payload: {
          compareToRunId,
        },
        requiresApproval: false,
      });
    }

    const correlation = report.summary?.lineage
      ? {
          traceId: report.rootRunId,
          spanId: report.runId,
          parentSpanId: report.summary.lineage.parentRunId || report.summary.lineage.branchOriginRunId || null,
        }
      : null;

    return {
      runId: report.runId,
      status: report.status,
      incidentType,
      recoveryPolicy,
      correlation,
      incident: report,
      steps,
      recommendedAction: steps[0]?.action || 'inspect_report',
    };
  }

  _classifyIncidentType(report) {
    if (report.pendingApproval) {
      return 'approval_blocked';
    }
    if (
      report.status === 'paused' &&
      (report.pendingPause?.stage === 'replay' || report.pendingPause?.stage === 'workflow_replay')
    ) {
      return 'paused_replay';
    }

    const failureMessage = `${report.failure?.name || ''} ${report.failure?.message || ''}`.toLowerCase();
    const hasWorkflowContext =
      (report.failedSteps || []).some(step => step.type === 'workflow_step') ||
      failureMessage.includes('workflow') ||
      failureMessage.includes('child branch');

    if (hasWorkflowContext) {
      return 'workflow_child_failure';
    }
    if (failureMessage.includes('queue')) {
      return 'queue_worker_failure';
    }
    if (failureMessage.includes('handoff') || failureMessage.includes('remote')) {
      return 'service_handoff_failure';
    }
    if (report.failedSteps?.some(step => step.type === 'tool')) {
      return 'tool_failure';
    }

    return report.status === 'failed' ? 'generic_failure' : 'generic_recovery';
  }

  _buildRecoveryPolicy(report, incidentType) {
    const sideEffectingFailure = (report.failedSteps || []).some(step => step.type === 'tool');
    return {
      incidentType,
      requiresApprovalForBranch:
        sideEffectingFailure ||
        incidentType === 'workflow_child_failure' ||
        incidentType === 'service_handoff_failure',
      prefersWorkflowScopedRecovery: incidentType === 'workflow_child_failure',
      prefersReplayFirst: incidentType === 'paused_replay',
      prefersCompareFirst:
        incidentType === 'queue_worker_failure' || incidentType === 'service_handoff_failure',
    };
  }
}

module.exports = { DistributedRecoveryPlanner };
