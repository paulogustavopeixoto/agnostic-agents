class ExternalControlPlaneCertificationKit {
  certify(target = {}, {
    type = 'dashboard',
    name = null,
  } = {}) {
    const targetName = name || target.name || `${type}-target`;
    const errors = [];
    const warnings = [];
    const capabilities = new Set([...(target.capabilities || [])]);

    const definition = TYPE_DEFINITIONS[type];
    if (!definition) {
      return {
        target: targetName,
        kind: 'external_control_plane_target',
        type,
        level: 'experimental',
        valid: false,
        errors: [`Unknown external control-plane target type "${type}".`],
        warnings: [],
        summary: { type },
      };
    }

    for (const requirement of definition.requiredCapabilities) {
      if (!capabilities.has(requirement)) {
        errors.push(`Target must declare capability "${requirement}".`);
      }
    }

    for (const recommendation of definition.recommendedCapabilities) {
      if (!capabilities.has(recommendation)) {
        warnings.push(`Recommended capability "${recommendation}" is not declared.`);
      }
    }

    return {
      target: targetName,
      kind: 'external_control_plane_target',
      type,
      level: errors.length === 0 ? 'federation_ready' : 'experimental',
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        type,
        requiredCapabilities: definition.requiredCapabilities,
        declaredCapabilities: [...capabilities],
      },
    };
  }
}

const TYPE_DEFINITIONS = {
  dashboard: {
    requiredCapabilities: ['runRead', 'incidentView', 'approvalState'],
    recommendedCapabilities: ['traceDiff', 'governanceTimeline'],
  },
  partner_runtime: {
    requiredCapabilities: ['governanceWebhook', 'eventForwarding', 'runExport'],
    recommendedCapabilities: ['approvalResolution', 'traceBundleExport'],
  },
};

module.exports = { ExternalControlPlaneCertificationKit };
