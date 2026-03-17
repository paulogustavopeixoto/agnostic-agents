const { ToolPolicy } = require('./ToolPolicy');

class PolicyPack {
  static get SCHEMA_VERSION() {
    return '1.0';
  }

  static get FORMAT() {
    return 'agnostic-agents-policy-pack';
  }

  constructor({
    id = null,
    name = 'policy-pack',
    version = null,
    description = '',
    defaultAction = 'allow',
    rules = [],
    allowTools = null,
    denyTools = null,
    metadata = {},
  } = {}) {
    this.id = id;
    this.name = name;
    this.version = version;
    this.description = description;
    this.defaultAction = defaultAction;
    this.rules = [...rules];
    this.allowTools = allowTools ? [...(Array.isArray(allowTools) ? allowTools : [allowTools])] : null;
    this.denyTools = denyTools ? [...(Array.isArray(denyTools) ? denyTools : [denyTools])] : null;
    this.metadata = { ...metadata };
  }

  toJSON() {
    return {
      schemaVersion: PolicyPack.SCHEMA_VERSION,
      format: PolicyPack.FORMAT,
      exportedAt: new Date().toISOString(),
      policyPack: {
        id: this.id,
        name: this.name,
        version: this.version,
        description: this.description,
        defaultAction: this.defaultAction,
        rules: [...this.rules],
        allowTools: this.allowTools ? [...this.allowTools] : null,
        denyTools: this.denyTools ? [...this.denyTools] : null,
        metadata: { ...this.metadata },
      },
    };
  }

  toToolPolicy(options = {}) {
    return new ToolPolicy({
      defaultAction: this.defaultAction,
      rules: [...this.rules],
      allowTools: this.allowTools ? [...this.allowTools] : null,
      denyTools: this.denyTools ? [...this.denyTools] : null,
      ...options,
    });
  }

  static fromJSON(payload = {}) {
    const source = payload.policyPack || payload;
    return new PolicyPack({
      id: source.id || null,
      name: source.name,
      version: source.version || null,
      description: source.description || '',
      defaultAction: source.defaultAction || 'allow',
      rules: source.rules || [],
      allowTools: source.allowTools || null,
      denyTools: source.denyTools || null,
      metadata: source.metadata || {},
    });
  }

  static fromToolPolicy(toolPolicy, metadata = {}) {
    const policy =
      toolPolicy instanceof ToolPolicy
        ? toolPolicy
        : new ToolPolicy(toolPolicy || {});

    return new PolicyPack({
      id: metadata.id || null,
      name: metadata.name || 'tool-policy-export',
      version: metadata.version || null,
      description: metadata.description || '',
      defaultAction: policy.defaultAction,
      rules: [...(policy.rules || [])],
      allowTools: policy.allowTools ? [...policy.allowTools] : null,
      denyTools: policy.denyTools ? [...policy.denyTools] : null,
      metadata: {
        exportedFrom: 'ToolPolicy',
        ...metadata.metadata,
      },
    });
  }

  diff(otherPolicyPack) {
    const other =
      otherPolicyPack instanceof PolicyPack
        ? otherPolicyPack
        : PolicyPack.fromJSON(otherPolicyPack || {});

    const currentRules = new Map(this.rules.map(rule => [rule.id || JSON.stringify(rule), rule]));
    const nextRules = new Map(other.rules.map(rule => [rule.id || JSON.stringify(rule), rule]));

    const addedRules = [...nextRules.entries()]
      .filter(([ruleId]) => !currentRules.has(ruleId))
      .map(([, rule]) => rule);
    const removedRules = [...currentRules.entries()]
      .filter(([ruleId]) => !nextRules.has(ruleId))
      .map(([, rule]) => rule);
    const changedRules = [...currentRules.entries()]
      .filter(([ruleId, rule]) => nextRules.has(ruleId) && JSON.stringify(rule) !== JSON.stringify(nextRules.get(ruleId)))
      .map(([ruleId, previous]) => ({
        ruleId,
        previous,
        next: nextRules.get(ruleId),
      }));

    return {
      left: {
        id: this.id,
        name: this.name,
        version: this.version,
      },
      right: {
        id: other.id,
        name: other.name,
        version: other.version,
      },
      defaultActionChanged: this.defaultAction !== other.defaultAction,
      descriptionChanged: this.description !== other.description,
      allowToolsChanged: JSON.stringify(this.allowTools || null) !== JSON.stringify(other.allowTools || null),
      denyToolsChanged: JSON.stringify(this.denyTools || null) !== JSON.stringify(other.denyTools || null),
      metadataChanged: JSON.stringify(this.metadata || {}) !== JSON.stringify(other.metadata || {}),
      addedRules,
      removedRules,
      changedRules,
    };
  }
}

module.exports = { PolicyPack };
