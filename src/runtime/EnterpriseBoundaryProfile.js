class EnterpriseBoundaryProfile {
  constructor({
    environments = [],
    approvalOrganizations = [],
    externalSystems = [],
    tenantBoundaries = [],
  } = {}) {
    this.environments = normalizeEntries(environments);
    this.approvalOrganizations = normalizeEntries(approvalOrganizations);
    this.externalSystems = normalizeEntries(externalSystems);
    this.tenantBoundaries = normalizeEntries(tenantBoundaries);
  }

  validate() {
    const errors = [];
    const warnings = [];

    if (this.environments.length === 0) {
      errors.push('At least one environment boundary must be declared.');
    }

    if (!this.environments.some(entry => entry.id === 'prod')) {
      warnings.push('No production environment boundary is declared.');
    }

    if (this.approvalOrganizations.length === 0) {
      warnings.push('No approval organizations are declared.');
    }

    if (this.externalSystems.length === 0) {
      warnings.push('No external systems are declared.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: this.toJSON(),
    };
  }

  toJSON() {
    return {
      kind: 'agnostic-agents/enterprise-boundary-profile',
      version: '1.0.0',
      environments: this.environments,
      approvalOrganizations: this.approvalOrganizations,
      externalSystems: this.externalSystems,
      tenantBoundaries: this.tenantBoundaries,
    };
  }
}

function normalizeEntries(entries = []) {
  return entries
    .map(entry => {
      if (!entry) {
        return null;
      }

      if (typeof entry === 'string') {
        return { id: entry };
      }

      if (typeof entry === 'object') {
        return {
          id: entry.id || entry.name || entry.key || 'unknown',
          ...entry,
        };
      }

      return null;
    })
    .filter(Boolean);
}

module.exports = { EnterpriseBoundaryProfile };
