class ApprovalDelegationContract {
  constructor({
    id,
    scope = [],
    approver = null,
    delegate = null,
    reusable = true,
    metadata = {},
  } = {}) {
    if (!id) {
      throw new Error('ApprovalDelegationContract requires id.');
    }
    this.id = id;
    this.scope = Array.isArray(scope) ? [...scope] : [];
    this.approver = approver;
    this.delegate = delegate;
    this.reusable = reusable;
    this.metadata = metadata;
  }

  appliesTo({ action = null, toolName = null, environment = null, tenant = null } = {}) {
    if (!this.scope.length) {
      return true;
    }
    return this.scope.some(entry => {
      if (entry.action && entry.action !== action) return false;
      if (entry.toolName && entry.toolName !== toolName) return false;
      if (entry.environment && entry.environment !== environment) return false;
      if (entry.tenant && entry.tenant !== tenant) return false;
      return true;
    });
  }

  toJSON() {
    return {
      id: this.id,
      scope: this.scope,
      approver: this.approver,
      delegate: this.delegate,
      reusable: this.reusable,
      metadata: this.metadata,
    };
  }
}

module.exports = { ApprovalDelegationContract };
