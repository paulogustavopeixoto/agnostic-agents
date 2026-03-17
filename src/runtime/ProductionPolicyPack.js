/**
 * Builds a reusable extension pack for common production policy and
 * governance controls without forcing a hosted control-plane model.
 */
class ProductionPolicyPack {
  /**
   * @param {object} [options]
   * @param {string} [options.name]
   * @param {string|null} [options.version]
   * @param {string} [options.environment]
   * @param {string[]} [options.denyToolNames]
   * @param {string[]} [options.protectedToolNames]
   * @param {string[]} [options.denySideEffectLevels]
   * @param {string[]} [options.requireApprovalSideEffectLevels]
   * @param {string[]} [options.requireApprovalTags]
   * @param {Function|null} [options.onGovernanceEvent]
   */
  constructor({
    name = 'production-policy-pack',
    version = null,
    environment = 'production',
    denyToolNames = [],
    protectedToolNames = [],
    denySideEffectLevels = ['destructive'],
    requireApprovalSideEffectLevels = ['external_write'],
    requireApprovalTags = ['sensitive'],
    onGovernanceEvent = null,
  } = {}) {
    this.name = name;
    this.version = version;
    this.environment = environment;
    this.denyToolNames = [...denyToolNames];
    this.protectedToolNames = [...protectedToolNames];
    this.denySideEffectLevels = [...denySideEffectLevels];
    this.requireApprovalSideEffectLevels = [...requireApprovalSideEffectLevels];
    this.requireApprovalTags = [...requireApprovalTags];
    this.onGovernanceEvent = onGovernanceEvent;
    this.governanceEvents = [];
  }

  buildPolicyRules() {
    const rules = [];

    if (this.denyToolNames.length) {
      rules.push({
        id: `${this.environment}-deny-tools`,
        toolNames: [...this.denyToolNames],
        action: 'deny',
        reason: `Blocked by the ${this.environment} policy pack.`,
      });
    }

    if (this.protectedToolNames.length) {
      rules.push({
        id: `${this.environment}-protected-tools`,
        toolNames: [...this.protectedToolNames],
        action: 'require_approval',
        reason: `Protected tools require approval in ${this.environment}.`,
      });
    }

    if (this.denySideEffectLevels.length) {
      rules.push({
        id: `${this.environment}-deny-side-effects`,
        sideEffectLevels: [...this.denySideEffectLevels],
        action: 'deny',
        reason: `Blocked side effects are not allowed in ${this.environment}.`,
      });
    }

    if (this.requireApprovalSideEffectLevels.length) {
      rules.push({
        id: `${this.environment}-approval-side-effects`,
        sideEffectLevels: [...this.requireApprovalSideEffectLevels],
        action: 'require_approval',
        reason: `These side effects require approval in ${this.environment}.`,
      });
    }

    if (this.requireApprovalTags.length) {
      rules.push({
        id: `${this.environment}-approval-tags`,
        tags: [...this.requireApprovalTags],
        action: 'require_approval',
        reason: `Sensitive tagged tools require approval in ${this.environment}.`,
      });
    }

    return rules;
  }

  buildGovernanceHooks() {
    return [
      async (type, payload = {}, context = {}) => {
        const event = {
          type,
          payload,
          runId: context.run?.id || payload.runId || null,
          toolName: payload.toolName || payload.request?.toolName || null,
          timestamp: new Date().toISOString(),
          environment: this.environment,
        };

        this.governanceEvents.push(event);

        if (typeof this.onGovernanceEvent === 'function') {
          await this.onGovernanceEvent(event, context);
        }
      },
    ];
  }

  listGovernanceEvents() {
    return [...this.governanceEvents];
  }

  toPolicyPack() {
    const { PolicyPack } = require('./PolicyPack');

    return new PolicyPack({
      name: this.name,
      version: this.version,
      description: `Portable policy artifact for ${this.environment}.`,
      defaultAction: 'allow',
      rules: this.buildPolicyRules(),
      metadata: {
        environment: this.environment,
        source: 'ProductionPolicyPack',
      },
    });
  }

  toExtension() {
    return {
      name: this.name,
      version: this.version,
      metadata: {
        environment: this.environment,
        purpose: 'production-policy-governance-pack',
      },
      contributes: {
        policyRules: this.buildPolicyRules(),
        governanceHooks: this.buildGovernanceHooks(),
      },
    };
  }
}

module.exports = { ProductionPolicyPack };
