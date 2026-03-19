class CompatibilitySummary {
  static build(entries = []) {
    const normalized = entries.filter(Boolean).map(entry => ({
      target: entry.target || 'unknown',
      kind: entry.kind || 'unknown',
      level: entry.level || 'experimental',
      valid: entry.valid !== false,
      errors: [...(entry.errors || [])],
      warnings: [...(entry.warnings || [])],
    }));

    return {
      total: normalized.length,
      valid: normalized.filter(entry => entry.valid).length,
      invalid: normalized.filter(entry => !entry.valid).length,
      byLevel: normalized.reduce((acc, entry) => {
        acc[entry.level] = (acc[entry.level] || 0) + 1;
        return acc;
      }, {}),
      entries: normalized,
    };
  }
}

module.exports = { CompatibilitySummary };
