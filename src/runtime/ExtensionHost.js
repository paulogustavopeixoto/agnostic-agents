const { EventBus } = require('./EventBus');
const { GovernanceHooks } = require('./GovernanceHooks');
const { ToolPolicy } = require('./ToolPolicy');

class ExtensionHost {
  constructor({ extensions = [] } = {}) {
    this.extensions = [];
    this.contributions = {
      eventSinks: [],
      governanceHooks: [],
      policyRules: [],
      environmentAdapters: [],
      evalScenarios: [],
      metadata: [],
    };

    extensions.forEach(extension => this.register(extension));
  }

  register(extension) {
    if (!extension) {
      throw new Error('ExtensionHost.register requires an extension.');
    }

    const normalized = this._normalizeExtension(extension);
    this.extensions.push(normalized);
    this._collect(normalized);
    return normalized;
  }

  listExtensions() {
    return this.extensions.map(extension => ({
      name: extension.name,
      version: extension.version || null,
      metadata: { ...(extension.metadata || {}) },
    }));
  }

  getEnvironmentAdapters() {
    return [...this.contributions.environmentAdapters];
  }

  getEvalScenarios() {
    return [...this.contributions.evalScenarios];
  }

  extendEventBus(eventBus = null) {
    const bus = eventBus instanceof EventBus ? eventBus : new EventBus(eventBus || {});
    this.contributions.eventSinks.forEach(sink => bus.addSink(sink));
    return bus;
  }

  extendGovernanceHooks(governanceHooks = null) {
    const hooks =
      governanceHooks instanceof GovernanceHooks
        ? governanceHooks
        : governanceHooks
          ? new GovernanceHooks(governanceHooks)
          : null;

    if (!this.contributions.governanceHooks.length) {
      return hooks;
    }

    return new GovernanceHooks({
      onEvent: async (type, payload, context) => {
        if (hooks) {
          await hooks.dispatch(type, payload, context);
        }
        for (const contribution of this.contributions.governanceHooks) {
          await contribution(type, payload, context);
        }
      },
    });
  }

  extendToolPolicy(toolPolicy = null) {
    const base =
      toolPolicy instanceof ToolPolicy ? toolPolicy : new ToolPolicy(toolPolicy || {});

    if (!this.contributions.policyRules.length) {
      return base;
    }

    return new ToolPolicy({
      ...base,
      rules: [...base.rules, ...this.contributions.policyRules],
      approvalHandler: base.approvalHandler,
      evaluate: base.customEvaluate,
      beforeExecute: base.beforeExecute,
      afterExecute: base.afterExecute,
      verify: base.customVerify,
    });
  }

  _normalizeExtension(extension) {
    if (typeof extension === 'function') {
      const produced = extension();
      if (!produced) {
        throw new Error('Extension factory returned no extension.');
      }
      return this._normalizeExtension(produced);
    }

    if (!extension.name) {
      throw new Error('Extensions require a name.');
    }

    return {
      name: extension.name,
      version: extension.version || null,
      metadata: { ...(extension.metadata || {}) },
      contributes: {
        eventSinks: [...(extension.contributes?.eventSinks || [])],
        governanceHooks: [...(extension.contributes?.governanceHooks || [])],
        policyRules: [...(extension.contributes?.policyRules || [])],
        environmentAdapters: [...(extension.contributes?.environmentAdapters || [])],
        evalScenarios: [...(extension.contributes?.evalScenarios || [])],
      },
    };
  }

  _collect(extension) {
    this.contributions.eventSinks.push(...extension.contributes.eventSinks);
    this.contributions.governanceHooks.push(...extension.contributes.governanceHooks);
    this.contributions.policyRules.push(...extension.contributes.policyRules);
    this.contributions.environmentAdapters.push(...extension.contributes.environmentAdapters);
    this.contributions.evalScenarios.push(...extension.contributes.evalScenarios);
    this.contributions.metadata.push({
      name: extension.name,
      version: extension.version,
      metadata: extension.metadata,
    });
  }
}

module.exports = { ExtensionHost };
