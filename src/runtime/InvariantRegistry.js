class InvariantRegistry {
  constructor({ invariants = [] } = {}) {
    this.invariants = [];
    for (const invariant of Array.isArray(invariants) ? invariants : []) {
      this.register(invariant);
    }
  }

  register(invariant = {}) {
    if (!invariant.id || typeof invariant.check !== 'function') {
      throw new Error('InvariantRegistry.register requires an id and check function.');
    }

    const normalized = {
      id: invariant.id,
      surface: invariant.surface || 'runtime',
      description: invariant.description || null,
      severity: invariant.severity || 'high',
      check: invariant.check,
    };
    this.invariants.push(normalized);
    return normalized;
  }

  list() {
    return this.invariants.map(({ check, ...rest }) => ({ ...rest }));
  }

  async evaluate(context = {}) {
    const results = [];

    for (const invariant of this.invariants) {
      const startedAt = Date.now();
      try {
        const output = await invariant.check(context);
        const passed =
          typeof output === 'boolean'
            ? output
            : output?.passed !== false;
        results.push({
          id: invariant.id,
          surface: invariant.surface,
          severity: invariant.severity,
          description: invariant.description,
          passed,
          details: typeof output === 'object' && output !== null ? output : {},
          durationMs: Date.now() - startedAt,
        });
      } catch (error) {
        results.push({
          id: invariant.id,
          surface: invariant.surface,
          severity: invariant.severity,
          description: invariant.description,
          passed: false,
          details: {
            error: error.message || String(error),
          },
          durationMs: Date.now() - startedAt,
        });
      }
    }

    return results;
  }
}

module.exports = { InvariantRegistry };
