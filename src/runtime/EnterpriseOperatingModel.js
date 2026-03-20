class EnterpriseOperatingModel {
  build({
    incident = null,
    recovery = null,
    rollback = null,
    approvals = [],
    checkpoints = [],
    fleet = null,
  } = {}) {
    const phases = [];

    if (incident) {
      phases.push({
        phase: 'incident',
        action: incident.action || incident.recommendedAction || 'inspect',
        summary: incident.summary || incident.reason || null,
      });
    }

    if (approvals.length) {
      phases.push({
        phase: 'approval',
        action: 'review',
        summary: `${approvals.length} approval boundaries active.`,
      });
    }

    if (checkpoints.length) {
      phases.push({
        phase: 'checkpoint',
        action: 'pause_or_resume',
        summary: `${checkpoints.length} supervised checkpoints available.`,
      });
    }

    if (recovery) {
      phases.push({
        phase: 'recovery',
        action: recovery.action || recovery.recommendedAction || 'recover',
        summary: recovery.summary || recovery.reason || null,
      });
    }

    if (rollback) {
      phases.push({
        phase: 'rollback',
        action: rollback.action || rollback.recommendedAction || 'rollback',
        summary: rollback.summary || rollback.reason || null,
      });
    }

    if (fleet) {
      phases.push({
        phase: 'fleet',
        action: fleet.action || 'monitor',
        summary: fleet.summary || null,
      });
    }

    return {
      phases,
      summary: {
        phases: phases.length,
        hasIncident: Boolean(incident),
        hasRecovery: Boolean(recovery),
        hasRollback: Boolean(rollback),
      },
    };
  }
}

module.exports = { EnterpriseOperatingModel };
