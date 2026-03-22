class TradeoffAnalyzer {
  evaluate({
    baseline = {},
    candidate = {},
    priorities = {},
  } = {}) {
    const weights = {
      cost: priorities.cost ?? 1,
      latency: priorities.latency ?? 1,
      safety: priorities.safety ?? 1,
      business: priorities.business ?? 1,
    };

    const metrics = {
      cost: compareLowerIsBetter(baseline.cost, candidate.cost),
      latency: compareLowerIsBetter(baseline.latency, candidate.latency),
      safety: compareHigherIsBetter(baseline.safety, candidate.safety),
      business: compareHigherIsBetter(baseline.business, candidate.business),
    };

    const weightedDelta = Object.entries(metrics).reduce((sum, [key, value]) => sum + value.delta * weights[key], 0);

    return {
      metrics,
      priorities: weights,
      weightedDelta: Number(weightedDelta.toFixed(2)),
      recommendation: weightedDelta >= 0 ? 'candidate_favored' : 'baseline_favored',
    };
  }
}

function compareLowerIsBetter(baseline = null, candidate = null) {
  if (typeof baseline !== 'number' || typeof candidate !== 'number') {
    return { baseline, candidate, delta: 0, improved: false };
  }

  const delta = baseline - candidate;
  return {
    baseline,
    candidate,
    delta: Number(delta.toFixed(2)),
    improved: candidate < baseline,
  };
}

function compareHigherIsBetter(baseline = null, candidate = null) {
  if (typeof baseline !== 'number' || typeof candidate !== 'number') {
    return { baseline, candidate, delta: 0, improved: false };
  }

  const delta = candidate - baseline;
  return {
    baseline,
    candidate,
    delta: Number(delta.toFixed(2)),
    improved: candidate > baseline,
  };
}

module.exports = { TradeoffAnalyzer };
