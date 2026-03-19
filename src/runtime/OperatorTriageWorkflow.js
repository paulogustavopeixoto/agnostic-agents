const { OperatorSummary } = require('./OperatorSummary');
const { OperatorInterventionPlanner } = require('./OperatorInterventionPlanner');

class OperatorTriageWorkflow {
  constructor({ summary = null, planner = null } = {}) {
    this.summary = summary instanceof OperatorSummary ? summary : new OperatorSummary(summary || {});
    this.planner =
      planner instanceof OperatorInterventionPlanner
        ? planner
        : new OperatorInterventionPlanner(planner || {});
  }

  run({
    runs = [],
    incidents = [],
    rollouts = [],
    learnedChanges = [],
    assuranceReports = [],
    primaryRun = null,
    primaryIncident = null,
    primaryAssurance = null,
    primaryRollout = null,
    primaryRollback = null,
    context = {},
  } = {}) {
    const operatorSummary = this.summary.summarize({
      runs,
      incidents,
      rollouts,
      learnedChanges,
      assuranceReports,
    });

    const intervention = this.planner.plan({
      run: primaryRun,
      incident: primaryIncident,
      assurance: primaryAssurance,
      rollout: primaryRollout,
      rollback: primaryRollback,
      context,
    });

    return {
      operatorSummary,
      intervention,
      checklist: [
        'Inspect the affected run tree and incident report before retrying automation.',
        'Confirm rollout and assurance signals before approving further propagation.',
        'Review pending learned changes and keep them inside governed envelopes.',
      ],
      context,
    };
  }
}

module.exports = { OperatorTriageWorkflow };
