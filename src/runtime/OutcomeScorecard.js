const { OperationalScorecard } = require('./OperationalScorecard');

class OutcomeScorecard {
  constructor({ operationalScorecard = null } = {}) {
    this.operationalScorecard =
      operationalScorecard instanceof OperationalScorecard
        ? operationalScorecard
        : new OperationalScorecard();
  }

  evaluate({
    runs = [],
    governance = null,
    memory = null,
    routing = null,
    operator = null,
    outcomes = {},
  } = {}) {
    const operational = this.operationalScorecard.evaluate({
      runs,
      governance,
      memory,
      routing,
      operator,
    });

    const businessScore = computeBusinessScore(outcomes);
    const serviceScore = computeServiceScore(outcomes);

    return {
      operational,
      outcomes: {
        business: businessScore,
        service: serviceScore,
      },
      overall: Math.round((operational.overall + businessScore.score + serviceScore.score) / 3),
    };
  }
}

function computeBusinessScore(outcomes = {}) {
  const target = typeof outcomes.businessTarget === 'number' ? outcomes.businessTarget : null;
  const actual = typeof outcomes.businessActual === 'number' ? outcomes.businessActual : null;
  const score = target && actual !== null
    ? Math.max(0, Math.min(100, Math.round((actual / target) * 100)))
    : 100;

  return {
    score,
    target,
    actual,
    met: target === null || actual >= target,
  };
}

function computeServiceScore(outcomes = {}) {
  const sla = typeof outcomes.serviceSla === 'number' ? outcomes.serviceSla : null;
  const actual = typeof outcomes.serviceActual === 'number' ? outcomes.serviceActual : null;
  const score = sla && actual !== null
    ? Math.max(0, Math.min(100, Math.round((actual / sla) * 100)))
    : 100;

  return {
    score,
    sla,
    actual,
    met: sla === null || actual >= sla,
  };
}

module.exports = { OutcomeScorecard };
