class RoutePromotionProof {
  static build({
    routeId = 'route',
    shadowReport = null,
    rollbackTarget = null,
    approvals = [],
    operator = null,
  } = {}) {
    const improvements = [];
    const regressions = [];
    const summary = shadowReport?.summary || {};

    compareMetric(improvements, regressions, 'successRate', summary.beforeSuccessRate, summary.afterSuccessRate, true);
    compareMetric(improvements, regressions, 'latency', summary.beforeLatency, summary.afterLatency, false);
    compareMetric(improvements, regressions, 'cost', summary.beforeCost, summary.afterCost, false);

    return {
      kind: 'agnostic-agents/route-promotion-proof',
      version: '1.0.0',
      routeId,
      shadowReport,
      rollbackTarget,
      approvals: [...approvals],
      operator,
      summary: {
        routeId,
        improvements,
        regressions,
        approvalCount: approvals.length,
        operator: operator || null,
        decision: regressions.length > 0 || approvals.length === 0 ? 'hold' : 'promote',
      },
    };
  }
}

function compareMetric(improvements, regressions, label, before, after, higherIsBetter) {
  if (typeof before !== 'number' || typeof after !== 'number' || Number.isNaN(before) || Number.isNaN(after)) {
    return;
  }

  if (before === after) {
    return;
  }

  const entry = { metric: label, before, after };
  const improved = higherIsBetter ? after > before : after < before;
  if (improved) {
    improvements.push(entry);
  } else {
    regressions.push(entry);
  }
}

module.exports = { RoutePromotionProof };
