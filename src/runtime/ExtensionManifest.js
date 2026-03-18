class ExtensionManifest {
  static get FORMAT() {
    return 'agnostic-agents-extension-manifest';
  }

  static get SCHEMA_VERSION() {
    return '1.0';
  }

  constructor({
    kind = 'extension',
    name = '',
    version = null,
    description = '',
    contracts = [],
    capabilities = [],
    compatibility = {},
    contributions = {},
    metadata = {},
  } = {}) {
    this.kind = kind;
    this.name = name;
    this.version = version;
    this.description = description;
    this.contracts = [...contracts];
    this.capabilities = [...capabilities];
    this.compatibility = { ...compatibility };
    this.contributions = {
      eventSinks: [...(contributions.eventSinks || [])],
      governanceHooks: [...(contributions.governanceHooks || [])],
      policyRules: [...(contributions.policyRules || [])],
      environmentAdapters: [...(contributions.environmentAdapters || [])],
      evalScenarios: [...(contributions.evalScenarios || [])],
      stores: [...(contributions.stores || [])],
      controlPlanes: [...(contributions.controlPlanes || [])],
      coordinationPackages: [...(contributions.coordinationPackages || [])],
    };
    this.metadata = { ...metadata };
  }

  toJSON() {
    return {
      format: ExtensionManifest.FORMAT,
      schemaVersion: ExtensionManifest.SCHEMA_VERSION,
      kind: this.kind,
      name: this.name,
      version: this.version,
      description: this.description,
      contracts: [...this.contracts],
      capabilities: [...this.capabilities],
      compatibility: { ...this.compatibility },
      contributions: JSON.parse(JSON.stringify(this.contributions)),
      metadata: { ...this.metadata },
    };
  }

  static fromJSON(payload = {}) {
    return new ExtensionManifest(payload);
  }

  static validate(payload = {}) {
    const errors = [];

    if (payload.format && payload.format !== ExtensionManifest.FORMAT) {
      errors.push(`Manifest format must be "${ExtensionManifest.FORMAT}".`);
    }

    if (payload.schemaVersion && payload.schemaVersion !== ExtensionManifest.SCHEMA_VERSION) {
      errors.push(`Manifest schemaVersion must be "${ExtensionManifest.SCHEMA_VERSION}".`);
    }

    if (!payload.name || typeof payload.name !== 'string') {
      errors.push('Manifest name is required.');
    }

    if (!payload.kind || typeof payload.kind !== 'string') {
      errors.push('Manifest kind is required.');
    }

    if (payload.contracts && !Array.isArray(payload.contracts)) {
      errors.push('Manifest contracts must be an array.');
    }

    if (payload.capabilities && !Array.isArray(payload.capabilities)) {
      errors.push('Manifest capabilities must be an array.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static fromExtension(extension = {}) {
    return new ExtensionManifest({
      kind: 'extension',
      name: extension.name || '',
      version: extension.version || null,
      description: extension.description || '',
      contracts: ['ExtensionHost'],
      capabilities: ExtensionManifest._listContributionKeys(extension.contributes || {}),
      compatibility: {
        runtime: '>=1.3.0',
      },
      contributions: {
        eventSinks: ExtensionManifest._mapNamedEntries(extension.contributes?.eventSinks, 'event_sink'),
        governanceHooks: ExtensionManifest._mapNamedEntries(extension.contributes?.governanceHooks, 'governance_hook'),
        policyRules: ExtensionManifest._mapNamedEntries(extension.contributes?.policyRules, 'policy_rule'),
        environmentAdapters: ExtensionManifest._mapNamedEntries(
          extension.contributes?.environmentAdapters,
          'environment_adapter'
        ),
        evalScenarios: ExtensionManifest._mapNamedEntries(extension.contributes?.evalScenarios, 'eval_scenario'),
      },
      metadata: { ...(extension.metadata || {}) },
    });
  }

  static _listContributionKeys(contributes = {}) {
    return Object.entries(contributes)
      .filter(([, value]) => Array.isArray(value) && value.length)
      .map(([key]) => key);
  }

  static _mapNamedEntries(entries = [], fallbackPrefix = 'entry') {
    return (entries || []).map((entry, index) => ({
      id: entry?.id || entry?.name || `${fallbackPrefix}-${index + 1}`,
    }));
  }
}

module.exports = { ExtensionManifest };
