class OperationalScorecard {
  evaluate({
    runs = [],
    governance = null,
    memory = null,
    routing = null,
    operator = null,
  } = {}) {
    const failedRuns = runs.filter(run => run?.status === 'failed').length;
    const pausedRuns = runs.filter(run => run?.status === 'paused' || run?.status === 'waiting_for_approval').length;
    const reliability = Math.max(0, 100 - failedRuns * 20 - pausedRuns * 5);

    const blockedGovernance = governance?.blocked || governance?.summary?.blocked || 0;
    const rollbackRecommendations = governance?.rollbackRecommendations || governance?.summary?.rollbackRecommendations || 0;
    const governanceScore = Math.max(0, 100 - blockedGovernance * 20 - rollbackRecommendations * 10);

    const memoryFlags = Array.isArray(memory?.flags) ? memory.flags.length : 0;
    const memoryFailures = memory?.summary?.benchmarkFailures || 0;
    const memoryHygiene = Math.max(0, 100 - memoryFlags * 10 - memoryFailures * 15);

    const degradedRoutes = routing?.degraded || 0;
    const driftedRoutes = routing?.drifted || 0;
    const routingQuality = Math.max(0, 100 - degradedRoutes * 15 - driftedRoutes * 10);

    const openIncidents = operator?.totals?.incidents || 0;
    const pendingReviews = operator?.learning?.pendingReview || 0;
    const operatorLoad = Math.max(0, 100 - openIncidents * 15 - pendingReviews * 10);

    return {
      reliability: {
        score: reliability,
        failedRuns,
        pausedRuns,
      },
      governance: {
        score: governanceScore,
        blocked: blockedGovernance,
        rollbackRecommendations,
      },
      memoryHygiene: {
        score: memoryHygiene,
        flags: memoryFlags,
        benchmarkFailures: memoryFailures,
      },
      routingQuality: {
        score: routingQuality,
        degraded: degradedRoutes,
        drifted: driftedRoutes,
      },
      operatorLoad: {
        score: operatorLoad,
        openIncidents,
        pendingReviews,
      },
      overall: Math.round((reliability + governanceScore + memoryHygiene + routingQuality + operatorLoad) / 5),
    };
  }
}

module.exports = { OperationalScorecard };
