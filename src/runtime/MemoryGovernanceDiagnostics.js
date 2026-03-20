class MemoryGovernanceDiagnostics {
  summarize({ auditView = null, benchmarkReport = null, stateSummary = null } = {}) {
    const flags = [];
    const recommendations = [];

    if ((auditView?.blocked || 0) > 0) {
      flags.push('memory_access_blocked');
      recommendations.push('Review trust-zone and role-based memory access rules before widening autonomy.');
    }

    if ((auditView?.conflicts || 0) > 0) {
      flags.push('memory_conflicts_detected');
      recommendations.push('Inspect competing records and verify trust scoring before accepting merged memory state.');
    }

    if ((auditView?.retentionActions || 0) > 0) {
      flags.push('memory_retention_active');
      recommendations.push('Check whether forgetting and expiration rules are removing needed operational context.');
    }

    if ((benchmarkReport?.failed || 0) > 0) {
      flags.push('memory_governance_eval_failure');
      recommendations.push('Address failed memory provenance or policy scenarios before rollout.');
    }

    if (!Array.isArray(stateSummary?.memoryContractSurfaces) || stateSummary.memoryContractSurfaces.length < 5) {
      flags.push('memory_contract_gaps');
      recommendations.push('Publish explicit memory access contracts for runtime, workflow, coordination, learning, and operator surfaces.');
    }

    return {
      flags,
      recommendations,
      summary: {
        blocked: auditView?.blocked || 0,
        conflicts: auditView?.conflicts || 0,
        retentionActions: auditView?.retentionActions || 0,
        benchmarkFailures: benchmarkReport?.failed || 0,
        contractSurfaces: stateSummary?.memoryContractSurfaces || [],
      },
    };
  }
}

module.exports = { MemoryGovernanceDiagnostics };
