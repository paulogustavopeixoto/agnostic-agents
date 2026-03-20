class FederatedPromotionBoundaryAdvisor {
  evaluate({
    candidateId = 'candidate',
    boundaries = [],
    targetRegion = null,
    targetJurisdiction = null,
    fleetRollback = null,
  } = {}) {
    const reasons = [];
    const matchedBoundaries = (Array.isArray(boundaries) ? boundaries : []).filter(boundary => {
      if (targetRegion && boundary.region && boundary.region !== targetRegion) {
        return false;
      }
      if (targetJurisdiction && boundary.jurisdiction && boundary.jurisdiction !== targetJurisdiction) {
        return false;
      }
      return true;
    });

    if (matchedBoundaries.length === 0) {
      reasons.push('No federated promotion boundary matches the requested region/jurisdiction.');
    }

    if (fleetRollback?.action === 'rollback_recommended') {
      reasons.push('Fleet rollback advisor recommends rollback for the target boundary.');
    }

    const restricted = matchedBoundaries.filter(boundary => boundary.promotion === 'hold');
    if (restricted.length > 0) {
      reasons.push(`Matched boundary requires hold: ${restricted.map(boundary => boundary.id).join(', ')}.`);
    }

    return {
      candidateId,
      region: targetRegion,
      jurisdiction: targetJurisdiction,
      matchedBoundaries,
      action: reasons.length === 0 ? 'promote_within_boundary' : 'hold_boundary',
      reasons,
      rollback: fleetRollback || null,
    };
  }
}

module.exports = { FederatedPromotionBoundaryAdvisor };
