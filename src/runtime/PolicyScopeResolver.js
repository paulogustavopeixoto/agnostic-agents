const { PolicyPack } = require('./PolicyPack');

class PolicyScopeResolver {
  static get DEFAULT_PRECEDENCE() {
    return ['runtime', 'workflow', 'agent', 'handoff'];
  }

  constructor({ precedence = PolicyScopeResolver.DEFAULT_PRECEDENCE, metadata = {} } = {}) {
    this.precedence = [...precedence];
    this.metadata = { ...metadata };
  }

  resolve(scopes = {}) {
    const normalizedScopes = this._normalizeScopes(scopes);
    const applied = this.precedence
      .map(scope => ({ scope, pack: normalizedScopes[scope] || null }))
      .filter(entry => entry.pack);

    if (!applied.length) {
      return new PolicyPack({
        name: 'resolved-policy-pack',
        description: 'Resolved scoped policy pack.',
        metadata: {
          ...this.metadata,
          appliedScopes: [],
          precedence: [...this.precedence],
        },
      });
    }

    const highestPrecedence = applied[applied.length - 1];
    const rules = [...applied]
      .reverse()
      .flatMap(({ scope, pack }) =>
        (pack.rules || []).map(rule => ({
          ...rule,
          scope: rule.scope || scope,
          inheritedFrom: rule.inheritedFrom || scope,
        }))
      );

    return new PolicyPack({
      id: highestPrecedence.pack.id || `resolved:${applied.map(entry => entry.scope).join(':')}`,
      name: highestPrecedence.pack.name || 'resolved-policy-pack',
      version: highestPrecedence.pack.version || null,
      description:
        highestPrecedence.pack.description ||
        `Resolved scoped policy pack across ${applied.map(entry => entry.scope).join(', ')}.`,
      defaultAction: this._resolveDefaultAction(applied),
      rules,
      allowTools: this._resolveAllowTools(applied),
      denyTools: this._resolveDenyTools(applied),
      metadata: {
        ...this.metadata,
        ...highestPrecedence.pack.metadata,
        appliedScopes: applied.map(entry => entry.scope),
        precedence: [...this.precedence],
        resolvedAt: new Date().toISOString(),
      },
    });
  }

  resolveToolPolicy(scopes = {}, options = {}) {
    return this.resolve(scopes).toToolPolicy(options);
  }

  _normalizeScopes(scopes = {}) {
    const normalized = {};

    Object.entries(scopes || {}).forEach(([rawScope, value]) => {
      const scope = this._normalizeScopeName(rawScope);
      if (!scope || !value) {
        return;
      }

      normalized[scope] = value instanceof PolicyPack ? value : PolicyPack.fromJSON(value);
    });

    return normalized;
  }

  _normalizeScopeName(scope) {
    if (!scope) return null;

    const normalized = String(scope);
    if (normalized === 'distributed' || normalized === 'distributedHandoff') {
      return 'handoff';
    }
    if (normalized === 'delegation' || normalized === 'delegate') {
      return 'agent';
    }
    return this.precedence.includes(normalized) ? normalized : null;
  }

  _resolveDefaultAction(applied = []) {
    for (let index = applied.length - 1; index >= 0; index -= 1) {
      const action = applied[index].pack.defaultAction;
      if (action) {
        return action;
      }
    }

    return 'allow';
  }

  _resolveAllowTools(applied = []) {
    const allowLists = applied
      .map(entry => entry.pack.allowTools)
      .filter(value => Array.isArray(value) && value.length);

    if (!allowLists.length) {
      return null;
    }

    return [...allowLists.slice(1).reduce(
      (intersection, tools) => new Set(tools.filter(toolName => intersection.has(toolName))),
      new Set(allowLists[0])
    )];
  }

  _resolveDenyTools(applied = []) {
    const denyLists = applied
      .map(entry => entry.pack.denyTools)
      .filter(value => Array.isArray(value) && value.length);

    if (!denyLists.length) {
      return null;
    }

    return [...new Set(denyLists.flat())];
  }
}

module.exports = { PolicyScopeResolver };
