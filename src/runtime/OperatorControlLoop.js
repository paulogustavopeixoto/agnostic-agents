const { OperatorTriageWorkflow } = require('./OperatorTriageWorkflow');
const { OperatorDashboardSnapshot } = require('./OperatorDashboardSnapshot');

class OperatorControlLoop {
  constructor({ triage = null, dashboard = null } = {}) {
    this.triage =
      triage instanceof OperatorTriageWorkflow ? triage : new OperatorTriageWorkflow(triage || {});
    this.dashboard =
      dashboard instanceof OperatorDashboardSnapshot
        ? dashboard
        : new OperatorDashboardSnapshot(dashboard || {});
  }

  run(options = {}) {
    const dashboard = this.dashboard.build({
      runs: options.runs || [],
      incidents: options.incidents || [],
      rollouts: options.rollouts || [],
      learnedChanges: options.learnedChanges || [],
      assuranceReports: options.assuranceReports || [],
      governance: options.governance || {},
    });

    const triage = this.triage.run(options);

    return {
      dashboard,
      triage,
      nextActions: [
        'review_dashboard',
        'confirm_intervention',
        'record_governance_decision',
      ],
    };
  }
}

module.exports = { OperatorControlLoop };
