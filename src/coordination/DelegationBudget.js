class DelegationBudget {
  constructor({ maxTotalDelegations = 0, perActor = {} } = {}) {
    this.maxTotalDelegations = Number.isFinite(maxTotalDelegations) ? maxTotalDelegations : 0;
    this.perActor = { ...perActor };
    this.usage = {
      total: 0,
      perActor: {},
    };
  }

  canDelegate({ actorId = null, count = 1 } = {}) {
    const nextTotal = this.usage.total + count;
    const currentActorUsage = actorId ? this.usage.perActor[actorId] || 0 : 0;
    const actorLimit = actorId ? this.perActor[actorId] : null;

    return {
      allowed:
        nextTotal <= this.maxTotalDelegations &&
        (typeof actorLimit !== 'number' || currentActorUsage + count <= actorLimit),
      nextTotal,
      actorId,
      nextActorUsage: actorId ? currentActorUsage + count : null,
      actorLimit,
    };
  }

  consume({ actorId = null, count = 1 } = {}) {
    const check = this.canDelegate({ actorId, count });
    if (!check.allowed) {
      return {
        ...check,
        consumed: false,
      };
    }

    this.usage.total += count;
    if (actorId) {
      this.usage.perActor[actorId] = (this.usage.perActor[actorId] || 0) + count;
    }

    return {
      ...check,
      consumed: true,
      usage: this.summarize(),
    };
  }

  summarize() {
    return {
      maxTotalDelegations: this.maxTotalDelegations,
      perActorLimits: { ...this.perActor },
      usage: {
        total: this.usage.total,
        perActor: { ...this.usage.perActor },
      },
    };
  }
}

module.exports = { DelegationBudget };
