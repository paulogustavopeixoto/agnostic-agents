const { RunInspector } = require('./RunInspector');
const { InterventionPolicyRegistry } = require('./InterventionPolicyRegistry');

class OperatorInterventionPlanner {
  constructor({ interventionPolicies = null } = {}) {
    this.interventionPolicies =
      interventionPolicies instanceof InterventionPolicyRegistry
        ? interventionPolicies
        : new InterventionPolicyRegistry({ policies: interventionPolicies || [] });
  }

  plan({
    run = null,
    incident = null,
    assurance = null,
    rollout = null,
    rollback = null,
    context = {},
  } = {}) {
    const runSummary = this._normalizeRun(run);
    const actions = [];
    const reasons = [];
    const intervention = this.interventionPolicies.select({
      environment: context.environment || rollout?.environment || null,
      taskFamily: context.taskFamily || incident?.taskFamily || null,
      riskClass: context.riskClass || incident?.riskClass || null,
      incidentType: context.incidentType || incident?.type || null,
    });

    if (runSummary?.status === 'running') {
      actions.push('pause_runtime');
      reasons.push('Pause the active runtime so operators can inspect the current execution boundary.');
    }

    if (runSummary?.status === 'waiting_for_approval') {
      actions.push('limit_automatic_execution');
      reasons.push('Limit automatic execution because the run is already waiting for operator approval.');
    }

    if (incident?.recommendedAction) {
      actions.push(incident.recommendedAction);
      reasons.push(`Incident workflow recommends ${incident.recommendedAction}.`);
    }

    if (this._getAssuranceVerdict(assurance) === 'block') {
      actions.push('quarantine_candidate');
      reasons.push('Quarantine the candidate because assurance invariants failed.');
    }

    if (rollback?.action === 'rollback_recommended') {
      actions.push('rollback_rollout');
      reasons.push('Rollback is recommended because fleet-level signals regressed after rollout.');
    }

    if (rollout?.action === 'halt') {
      actions.push('halt_rollout');
      reasons.push('Halt the rollout because the fleet safety controller reported unsafe conditions.');
    }

    if (intervention.recommendedAction) {
      actions.push(intervention.recommendedAction);
      reasons.push(
        intervention.rationale ||
          `Intervention policy "${intervention.selectedPolicy.id}" recommends ${intervention.recommendedAction}.`
      );
    }

    if (!actions.length) {
      actions.push('monitor_only');
      reasons.push('No intervention is required yet; continue operator monitoring.');
    }

    return {
      recommendedAction: actions[0],
      actions: [...new Set(actions)],
      reasons,
      run: runSummary,
      incident: incident || null,
      assurance: assurance || null,
      rollout: rollout || null,
      rollback: rollback || null,
      intervention,
      context,
    };
  }

  _normalizeRun(run) {
    if (!run) {
      return null;
    }
    if (this._isRunSummary(run)) {
      return run;
    }
    return RunInspector.summarize(run);
  }

  _isRunSummary(run) {
    return (
      typeof run === 'object' &&
      !Array.isArray(run) &&
      typeof run.events === 'number' &&
      Array.isArray(run.steps) &&
      Array.isArray(run.checkpoints)
    );
  }

  _getAssuranceVerdict(assurance) {
    return assurance?.verdict || assurance?.summary?.verdict || assurance?.explanation?.verdict || null;
  }
}

module.exports = { OperatorInterventionPlanner };
