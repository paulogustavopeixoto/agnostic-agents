const { randomUUID } = require('crypto');
const { ToolPolicyError } = require('../errors');

/** Conservative upper-bound reservations. Unknown/failed work is never automatically refunded. */
class RunBudget {
  constructor({ limits, estimate } = {}) {
    if (!limits || !Object.keys(limits).length || typeof estimate !== 'function' ||
        Object.entries(limits).some(([key, value]) => !['tokens', 'costMicros'].includes(key) ||
          !Number.isSafeInteger(value) || value < 0)) throw new TypeError('Invalid run budget.');
    this.limits = { ...limits };
    this.estimate = estimate;
  }

  async reserve(run, request) {
    const previous = run.state.resourceBudget;
    if (previous?.breached || (previous && (!previous.limits ||
        Object.keys(previous.limits).length !== Object.keys(this.limits).length ||
        Object.entries(this.limits).some(([key, value]) => previous.limits[key] !== value)))) {
      throw new ToolPolicyError('Run budget is breached or its limits changed.');
    }
    const upperBound = await this.estimate(request, { run });
    const state = previous || { version: '1', limits: { ...this.limits }, reserved: {}, reservations: [] };
    const next = {};
    for (const [metric, limit] of Object.entries(this.limits)) {
      const amount = upperBound?.[metric];
      const used = state.reserved[metric] ?? 0;
      if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(used) || used < 0 ||
          !Number.isSafeInteger(used + amount) || used + amount > limit) {
        throw new ToolPolicyError(`Insufficient or unknown ${metric} budget.`);
      }
      next[metric] = used + amount;
    }
    const reservation = { id: randomUUID(), operation: request.operation, upperBound:
      Object.fromEntries(Object.keys(this.limits).map(metric => [metric, upperBound[metric]])), status: 'reserved' };
    state.reserved = next;
    state.reservations.push(reservation);
    run.state.resourceBudget = state;
    return reservation;
  }

  settle(run, reservation, actual = {}) {
    for (const [metric, upper] of Object.entries(reservation.upperBound)) {
      if (actual[metric] === undefined) continue;
      if (!Number.isSafeInteger(actual[metric]) || actual[metric] < 0 || actual[metric] > upper) {
        reservation.status = 'breached';
        run.state.resourceBudget.breached = true;
        throw new ToolPolicyError(`Actual ${metric} usage exceeds its reserved bound or is invalid.`);
      }
    }
    reservation.status = 'completed';
    reservation.actual = Object.fromEntries(Object.keys(this.limits)
      .filter(metric => actual[metric] !== undefined).map(metric => [metric, actual[metric]]));
  }
}

module.exports = { RunBudget };
