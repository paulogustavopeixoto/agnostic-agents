const { OperatorSummary } = require('./OperatorSummary');
const { GovernanceTimeline } = require('./GovernanceTimeline');

class OperatorDashboardSnapshot {
  constructor({ summary = null, timeline = null } = {}) {
    this.summary = summary instanceof OperatorSummary ? summary : new OperatorSummary(summary || {});
    this.timeline = timeline instanceof GovernanceTimeline ? timeline : new GovernanceTimeline(timeline || {});
  }

  build({
    runs = [],
    incidents = [],
    rollouts = [],
    learnedChanges = [],
    assuranceReports = [],
    governance = {},
  } = {}) {
    return {
      summary: this.summary.summarize({
        runs,
        incidents,
        rollouts,
        learnedChanges,
        assuranceReports,
      }),
      governanceTimeline: this.timeline.build(governance),
      panels: {
        runs: runs.length,
        incidents: incidents.length,
        rollouts: rollouts.length,
        learnedChanges: learnedChanges.length,
        assuranceReports: assuranceReports.length,
      },
    };
  }
}

module.exports = { OperatorDashboardSnapshot };
