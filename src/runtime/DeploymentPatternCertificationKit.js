const { CertificationKit } = require('./CertificationKit');

class DeploymentPatternCertificationKit {
  constructor({ certificationKit = new CertificationKit() } = {}) {
    this.certificationKit = certificationKit;
  }

  certify(deployment = {}, { pattern = 'supervised_autonomy_stack', name = null } = {}) {
    const definition = PATTERN_DEFINITIONS[pattern];
    const target = name || deployment.name || pattern;
    const errors = [];
    const warnings = [];

    if (!definition) {
      return {
        target,
        kind: 'deployment_pattern',
        pattern,
        level: 'experimental',
        valid: false,
        errors: [`Unknown deployment pattern "${pattern}".`],
        warnings: [],
        summary: {
          pattern,
        },
      };
    }

    const serviceIds = normalizeServices(deployment.services);
    const capabilities = new Set([...(deployment.capabilities || [])]);
    const environmentScopes = new Set([...(deployment.environmentScopes || [])]);
    const approvalOrganizations = new Set([...(deployment.approvalOrganizations || [])]);
    const tenantBoundaries = new Set([...(deployment.tenantBoundaries || [])]);

    for (const serviceId of definition.requiredServices) {
      if (!serviceIds.has(serviceId)) {
        errors.push(`Deployment pattern requires service "${serviceId}".`);
      }
    }

    for (const capability of definition.requiredCapabilities) {
      if (!capabilities.has(capability)) {
        errors.push(`Deployment pattern requires capability "${capability}".`);
      }
    }

    for (const scope of definition.requiredEnvironmentScopes) {
      if (!environmentScopes.has(scope)) {
        errors.push(`Deployment pattern requires environment scope "${scope}".`);
      }
    }

    for (const org of definition.requiredApprovalOrganizations) {
      if (!approvalOrganizations.has(org)) {
        errors.push(`Deployment pattern requires approval organization "${org}".`);
      }
    }

    for (const boundary of definition.requiredTenantBoundaries) {
      if (!tenantBoundaries.has(boundary)) {
        errors.push(`Deployment pattern requires tenant boundary "${boundary}".`);
      }
    }

    for (const recommendation of definition.recommendedServices) {
      if (!serviceIds.has(recommendation)) {
        warnings.push(`Recommended service "${recommendation}" is not declared.`);
      }
    }

    for (const recommendation of definition.recommendedCapabilities) {
      if (!capabilities.has(recommendation)) {
        warnings.push(`Recommended capability "${recommendation}" is not declared.`);
      }
    }

    const providerResults = (deployment.providers || []).map(provider => this.certificationKit.certifyProvider(
      provider.adapter || provider,
      { name: provider.name || provider.id || provider.adapter?.constructor?.name || 'provider' }
    ));
    const storeResults = Object.entries(deployment.stores || {}).map(([type, store]) =>
      this.certificationKit.certifyStore(store, {
        type,
        name: `${target}-${type}-store`,
      })
    );

    for (const storeType of definition.requiredStores) {
      if (!storeResults.find(result => result.summary?.storeType === storeType && result.valid)) {
        errors.push(`Deployment pattern requires a certified ${storeType} store.`);
      }
    }

    const invalidProviderResults = providerResults.filter(result => !result.valid);
    const invalidStoreResults = storeResults.filter(result => !result.valid);
    if (invalidProviderResults.length > 0) {
      errors.push('One or more provider adapters failed certification.');
    }
    if (invalidStoreResults.length > 0) {
      errors.push('One or more stores failed certification.');
    }

    return {
      target,
      kind: 'deployment_pattern',
      pattern,
      level: errors.length === 0 ? 'operationally_certified' : 'experimental',
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        pattern,
        description: definition.description,
        requiredServices: definition.requiredServices,
        declaredServices: [...serviceIds],
        requiredCapabilities: definition.requiredCapabilities,
        declaredCapabilities: [...capabilities],
        environmentScopes: [...environmentScopes],
        approvalOrganizations: [...approvalOrganizations],
        tenantBoundaries: [...tenantBoundaries],
        providerResults,
        storeResults,
      },
    };
  }

  certifyMany(entries = []) {
    return entries.map(entry => this.certify(entry.deployment, {
      pattern: entry.pattern,
      name: entry.name,
    }));
  }
}

function normalizeServices(services = []) {
  return new Set(
    services
      .map(service => {
        if (!service) {
          return null;
        }
        if (typeof service === 'string') {
          return service;
        }
        if (typeof service === 'object') {
          return service.id || service.name || service.kind || null;
        }
        return null;
      })
      .filter(Boolean)
  );
}

const PATTERN_DEFINITIONS = {
  supervised_autonomy_stack: {
    description: 'Long-lived supervised autonomy with assurance, operators, and rollback controls.',
    requiredServices: ['runtime', 'policy', 'operator', 'assurance'],
    recommendedServices: ['fleet', 'learning'],
    requiredCapabilities: ['approvalWorkflows', 'humanReview', 'rollback'],
    recommendedCapabilities: ['routeDiagnostics', 'memoryGovernance'],
    requiredStores: ['run', 'job'],
    requiredEnvironmentScopes: ['staging', 'prod'],
    requiredApprovalOrganizations: ['ops'],
    requiredTenantBoundaries: [],
  },
  remote_control_plane: {
    description: 'Remote control plane managing autonomous workers across environments.',
    requiredServices: ['runtime', 'control_plane', 'worker'],
    recommendedServices: ['operator', 'fleet'],
    requiredCapabilities: ['remoteGovernance', 'rolloutControl', 'queueBacklog'],
    recommendedCapabilities: ['incidentExport'],
    requiredStores: ['run', 'job'],
    requiredEnvironmentScopes: ['prod'],
    requiredApprovalOrganizations: [],
    requiredTenantBoundaries: [],
  },
  public_control_plane: {
    description: 'Public-facing control plane with tenant and approval boundaries.',
    requiredServices: ['control_plane', 'operator', 'policy'],
    recommendedServices: ['assurance'],
    requiredCapabilities: ['auditExport', 'tenantIsolation', 'approvalWorkflows'],
    recommendedCapabilities: ['routeDiagnostics'],
    requiredStores: ['run'],
    requiredEnvironmentScopes: ['prod'],
    requiredApprovalOrganizations: ['ops', 'compliance'],
    requiredTenantBoundaries: ['tenant_id'],
  },
  deployment_split: {
    description: 'Separated API, worker, and control plane deployment with governed handoff.',
    requiredServices: ['api', 'worker', 'control_plane'],
    recommendedServices: ['operator'],
    requiredCapabilities: ['handoff', 'queueBacklog', 'rollback'],
    recommendedCapabilities: ['checkpointRestore'],
    requiredStores: ['run', 'job'],
    requiredEnvironmentScopes: ['staging', 'prod'],
    requiredApprovalOrganizations: [],
    requiredTenantBoundaries: [],
  },
};

module.exports = { DeploymentPatternCertificationKit };
