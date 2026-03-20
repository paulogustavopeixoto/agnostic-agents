const { FleetHealthMonitor } = require('./FleetHealthMonitor');

class RouteFleetDiagnostics {
  constructor({ monitor = null } = {}) {
    this.monitor = monitor instanceof FleetHealthMonitor ? monitor : new FleetHealthMonitor(monitor || {});
  }

  analyze(summary = null) {
    const snapshots = Array.isArray(this.monitor.snapshots) ? this.monitor.snapshots : [];
    const fleet = summary || this.monitor.summarize();
    const routeEntries = snapshots.flatMap(snapshot =>
      Array.isArray(snapshot.routeMetrics)
        ? snapshot.routeMetrics.map(metric => ({
            environmentId: snapshot.environmentId || 'default',
            tenantId: snapshot.tenantId || null,
            routeId: metric.routeId || 'unknown-route',
            selectedCount: Number.isFinite(metric.selectedCount) ? metric.selectedCount : 0,
            degraded: Boolean(metric.degraded),
            saturation: Number.isFinite(metric.saturation) ? metric.saturation : 0,
            driftScore: Number.isFinite(metric.driftScore) ? metric.driftScore : 0,
            fallbackRate: Number.isFinite(metric.fallbackRate) ? metric.fallbackRate : 0,
          }))
        : []
    );

    const routeMap = new Map();
    for (const entry of routeEntries) {
      const existing = routeMap.get(entry.routeId) || {
        routeId: entry.routeId,
        selectedCount: 0,
        degradedCount: 0,
        maxSaturation: 0,
        maxDriftScore: 0,
        maxFallbackRate: 0,
        environments: new Set(),
        tenants: new Set(),
      };
      existing.selectedCount += entry.selectedCount;
      existing.degradedCount += entry.degraded ? 1 : 0;
      existing.maxSaturation = Math.max(existing.maxSaturation, entry.saturation);
      existing.maxDriftScore = Math.max(existing.maxDriftScore, entry.driftScore);
      existing.maxFallbackRate = Math.max(existing.maxFallbackRate, entry.fallbackRate);
      existing.environments.add(entry.environmentId);
      if (entry.tenantId) {
        existing.tenants.add(entry.tenantId);
      }
      routeMap.set(entry.routeId, existing);
    }

    const routes = [...routeMap.values()]
      .map(route => ({
        routeId: route.routeId,
        selectedCount: route.selectedCount,
        degradedCount: route.degradedCount,
        maxSaturation: Number(route.maxSaturation.toFixed(2)),
        maxDriftScore: Number(route.maxDriftScore.toFixed(2)),
        maxFallbackRate: Number(route.maxFallbackRate.toFixed(2)),
        environments: route.environments.size,
        tenants: route.tenants.size,
      }))
      .sort(
        (left, right) =>
          right.maxDriftScore - left.maxDriftScore ||
          right.degradedCount - left.degradedCount ||
          right.maxSaturation - left.maxSaturation
      );

    const degradedRoutes = routes.filter(route => route.degradedCount > 0);
    const highDriftRoutes = routes.filter(route => route.maxDriftScore >= 0.5);
    const saturatedRoutes = routes.filter(route => route.maxSaturation >= 0.8);

    return {
      fleet: fleet || null,
      totalRoutes: routes.length,
      degradedRoutes: degradedRoutes.length,
      highDriftRoutes: highDriftRoutes.length,
      saturatedRoutes: saturatedRoutes.length,
      routes,
      alerts: [
        ...degradedRoutes.map(route => `Route "${route.routeId}" is degraded in ${route.degradedCount} fleet snapshot(s).`),
        ...highDriftRoutes.map(route => `Route "${route.routeId}" shows drift score ${route.maxDriftScore}.`),
        ...saturatedRoutes.map(route => `Route "${route.routeId}" reached saturation ${route.maxSaturation}.`),
      ],
    };
  }
}

module.exports = { RouteFleetDiagnostics };
