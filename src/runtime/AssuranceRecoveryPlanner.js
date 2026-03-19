const { AssuranceReport } = require('./AssuranceReport');

class AssuranceRecoveryPlanner {
  plan(report = {}) {
    const assuranceReport = report instanceof AssuranceReport ? report : new AssuranceReport(report || {});
    const explanation = assuranceReport.explain();
    const blocked = explanation.verdict === 'block';

    return {
      action: blocked ? 'rollback_or_quarantine' : 'no_recovery_needed',
      affectedSurfaces: [...new Set(explanation.violations.map(item => item.surface || 'runtime'))],
      steps: blocked
        ? [
            'Block rollout of the current candidate.',
            'Restore the last known safe rollout stage or version.',
            'Quarantine the failing candidate until the assurance violations are resolved.',
          ]
        : [],
      regressionLinks: explanation.violations.map(item => ({
        sourceId: item.id,
        surface: item.surface || 'runtime',
        reason: item.reason || null,
      })),
    };
  }
}

module.exports = { AssuranceRecoveryPlanner };
