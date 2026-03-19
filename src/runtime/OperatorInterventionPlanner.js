const { RunInspector } = require('./RunInspector');

class OperatorInterventionPlanner {
  plan({
    run = null,
    incident = null,
    assurance = null,
    rollout = null,
    rollback = null,
    context = {},
  } = {}) {
    const runSummary = run ? RunInspector.summarize(run) : null;
    const actions = [];
    const reasons = [];

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

    if (assurance?.verdict === 'block') {
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
      context,
    };
  }
}

module.exports = { OperatorInterventionPlanner };
