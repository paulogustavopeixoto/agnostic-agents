class CoordinationRoleContract {
  static get DEFAULT_ROLES() {
    return ['planner', 'executor', 'verifier', 'critic', 'aggregator'];
  }

  constructor({
    id = null,
    role = 'executor',
    capabilities = [],
    responsibilities = [],
    trustDomain = null,
    reviewMode = 'standard',
    metadata = {},
  } = {}) {
    this.id = id || `${role}-contract`;
    this.role = CoordinationRoleContract.DEFAULT_ROLES.includes(role) ? role : 'executor';
    this.capabilities = Array.isArray(capabilities) ? [...capabilities] : [];
    this.responsibilities = Array.isArray(responsibilities) ? [...responsibilities] : [];
    this.trustDomain = trustDomain || null;
    this.reviewMode = reviewMode || 'standard';
    this.metadata = { ...metadata };
  }

  toJSON() {
    return {
      id: this.id,
      role: this.role,
      capabilities: [...this.capabilities],
      responsibilities: [...this.responsibilities],
      trustDomain: this.trustDomain,
      reviewMode: this.reviewMode,
      metadata: { ...this.metadata },
    };
  }

  static fromJSON(payload = {}) {
    return new CoordinationRoleContract(payload);
  }
}

module.exports = { CoordinationRoleContract };
