class OperatorSummary {
  summarize({
    runs = [],
    incidents = [],
    rollouts = [],
    learnedChanges = [],
    assuranceReports = [],
  } = {}) {
    const statuses = runs.reduce((accumulator, run) => {
      const status = run?.status || 'unknown';
      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    }, {});

    const blockedAssurance = assuranceReports.filter(item => this._getAssuranceVerdict(item) === 'block').length;
    const rollbackRecommendations = rollouts.filter(item => item?.action === 'rollback_recommended').length;

    return {
      totals: {
        runs: runs.length,
        incidents: incidents.length,
        rollouts: rollouts.length,
        learnedChanges: learnedChanges.length,
        assuranceReports: assuranceReports.length,
      },
      runStatuses: statuses,
      rollouts: {
        rollbackRecommendations,
        halted: rollouts.filter(item => item?.action === 'halt').length,
      },
      assurance: {
        blocked: blockedAssurance,
        allowed: assuranceReports.filter(item => this._getAssuranceVerdict(item) === 'allow').length,
      },
      learning: {
        pendingReview: learnedChanges.filter(item => item?.status === 'pending_review').length,
        approved: learnedChanges.filter(item => item?.status === 'approved').length,
      },
      highlights: this._buildHighlights({
        statuses,
        blockedAssurance,
        rollbackRecommendations,
        incidents,
        learnedChanges,
      }),
    };
  }

  _buildHighlights({ statuses, blockedAssurance, rollbackRecommendations, incidents, learnedChanges }) {
    const highlights = [];

    if ((statuses.failed || 0) > 0) {
      highlights.push(`${statuses.failed} run(s) are currently failed and need triage.`);
    }
    if (incidents.length > 0) {
      highlights.push(`${incidents.length} incident report(s) are open for operator review.`);
    }
    if (blockedAssurance > 0) {
      highlights.push(`${blockedAssurance} assurance report(s) are blocking rollout.`);
    }
    if (rollbackRecommendations > 0) {
      highlights.push(`${rollbackRecommendations} rollout(s) recommend rollback based on fleet signals.`);
    }
    const pendingReview = learnedChanges.filter(item => item?.status === 'pending_review').length;
    if (pendingReview > 0) {
      highlights.push(`${pendingReview} learned change(s) are waiting for operator review.`);
    }
    if (!highlights.length) {
      highlights.push('No urgent operator actions are currently surfaced.');
    }

    return highlights;
  }

  _getAssuranceVerdict(item) {
    return item?.verdict || item?.summary?.verdict || item?.explanation?.verdict || null;
  }
}

module.exports = { OperatorSummary };
