class AutonomyDriftGuard {
  evaluate(comparison = {}, { blockedSections = [], maxChanges = null } = {}) {
    const reasons = [];
    const sectionsChanged = comparison?.summary?.sectionsChanged || [];
    const totalChanges = comparison?.summary?.totalChanges || 0;

    for (const section of blockedSections) {
      if (sectionsChanged.includes(section)) {
        reasons.push(`Detected drift in blocked section "${section}".`);
      }
    }

    if (typeof maxChanges === 'number' && totalChanges > maxChanges) {
      reasons.push(`Detected ${totalChanges} config changes, which exceeds the allowed maximum ${maxChanges}.`);
    }

    return {
      action: reasons.length ? 'block_deploy' : 'allow_deploy',
      reasons,
      summary: comparison.summary || { totalChanges: 0, sectionsChanged: [] },
    };
  }
}

module.exports = { AutonomyDriftGuard };
