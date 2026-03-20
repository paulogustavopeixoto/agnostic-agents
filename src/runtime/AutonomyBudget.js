class AutonomyBudget {
  constructor({
    spend = null,
    retries = null,
    toolCalls = null,
    wallClockMs = null,
    externalActions = null,
    tokens = null,
    metadata = {},
  } = {}) {
    this.limits = {
      spend,
      retries,
      toolCalls,
      wallClockMs,
      externalActions,
      tokens,
    };
    this.usage = {
      spend: 0,
      retries: 0,
      toolCalls: 0,
      wallClockMs: 0,
      externalActions: 0,
      tokens: 0,
    };
    this.metadata = metadata;
  }

  record(delta = {}) {
    for (const key of Object.keys(this.usage)) {
      if (typeof delta[key] === 'number') {
        this.usage[key] += delta[key];
      }
    }
    return this.snapshot();
  }

  snapshot() {
    return {
      limits: { ...this.limits },
      usage: { ...this.usage },
      remaining: Object.fromEntries(
        Object.entries(this.limits).map(([key, limit]) => [key, typeof limit === 'number' ? limit - this.usage[key] : null])
      ),
      exhausted: this.exhausted(),
      metadata: { ...this.metadata },
    };
  }

  exhausted() {
    return Object.entries(this.limits)
      .filter(([, limit]) => typeof limit === 'number')
      .some(([key, limit]) => this.usage[key] > limit);
  }

  violations() {
    return Object.entries(this.limits)
      .filter(([, limit]) => typeof limit === 'number')
      .filter(([key, limit]) => this.usage[key] > limit)
      .map(([key, limit]) => ({
        metric: key,
        limit,
        usage: this.usage[key],
      }));
  }
}

module.exports = { AutonomyBudget };
