class RoutePolicySimulator {
  constructor({ router = null } = {}) {
    this.router = router;
  }

  async simulate(scenarios = []) {
    const results = [];
    for (const scenario of scenarios) {
      if (!this.router || (typeof this.router.route !== 'function' && typeof this.router.select !== 'function')) {
        throw new Error('RoutePolicySimulator requires a router with route(...) or select(...).');
      }
      const route = typeof this.router.route === 'function'
        ? await this.router.route(scenario.task || {}, scenario.options || {})
        : await this.router.select(scenario.task || {}, scenario.options?.candidates);
      results.push({
        id: scenario.id || null,
        route,
        degraded: Boolean(route?.warnings?.length),
        reason: route?.explanation || null,
      });
    }
    return {
      scenarios: results,
      summary: {
        total: results.length,
        degraded: results.filter(result => result.degraded).length,
      },
    };
  }
}

module.exports = { RoutePolicySimulator };
