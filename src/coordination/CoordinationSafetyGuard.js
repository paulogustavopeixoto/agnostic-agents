const { DelegationBudget } = require('./DelegationBudget');
const { SharedContextScope } = require('./SharedContextScope');

class CoordinationSafetyGuard {
  constructor({
    maxRepeatedActionCount = 2,
    forbiddenRoleOverlaps = [
      ['executor', 'verifier'],
      ['executor', 'critic'],
    ],
    delegationBudget = null,
    sharedContextScope = null,
  } = {}) {
    this.maxRepeatedActionCount = maxRepeatedActionCount;
    this.forbiddenRoleOverlaps = forbiddenRoleOverlaps.map(pair => [...pair]);
    this.delegationBudget =
      delegationBudget instanceof DelegationBudget ? delegationBudget : new DelegationBudget(delegationBudget || {});
    this.sharedContextScope =
      sharedContextScope instanceof SharedContextScope
        ? sharedContextScope
        : new SharedContextScope(sharedContextScope || {});
  }

  evaluate({
    history = [],
    assignments = [],
    sharedContext = {},
    requestedDelegations = [],
  } = {}) {
    const flags = [];
    const reasons = [];

    const repeatedAction = this._detectRepeatedAction(history);
    if (repeatedAction) {
      flags.push('anti_loop_triggered');
      reasons.push(
        `Coordination action "${repeatedAction.action}" repeated ${repeatedAction.count} times, exceeding safety threshold ${this.maxRepeatedActionCount}.`
      );
    }

    const overlap = this._detectForbiddenOverlap(assignments);
    if (overlap) {
      flags.push('anti_collusion_triggered');
      reasons.push(
        `Actor "${overlap.actorId}" is assigned to both ${overlap.roles[0]} and ${overlap.roles[1]}, which is not allowed.`
      );
    }

    const budgetSnapshot = this.delegationBudget.summarize();
    const simulatedBudget = new DelegationBudget({
      maxTotalDelegations: budgetSnapshot.maxTotalDelegations,
      perActor: budgetSnapshot.perActorLimits,
    });
    simulatedBudget.usage = {
      total: budgetSnapshot.usage.total,
      perActor: { ...budgetSnapshot.usage.perActor },
    };
    const delegationChecks = requestedDelegations.map(request =>
      simulatedBudget.consume({
        actorId: request.actorId,
        count: request.count || 1,
      })
    );
    if (delegationChecks.some(check => !check.consumed)) {
      flags.push('delegation_budget_exhausted');
      reasons.push('Requested delegations exceed the configured delegation budget.');
    }

    const filteredContext = assignments.reduce((acc, assignment) => {
      acc[assignment.role] = this.sharedContextScope.filter(assignment.role, sharedContext);
      return acc;
    }, {});

    const redactedKeys = [...new Set(Object.values(filteredContext).flatMap(entry => entry.redactedKeys || []))];
    if (redactedKeys.length > 0) {
      flags.push('scoped_shared_context_enforced');
    }

    return {
      action: flags.some(flag => ['anti_loop_triggered', 'anti_collusion_triggered', 'delegation_budget_exhausted'].includes(flag))
        ? 'block'
        : redactedKeys.length > 0
          ? 'review'
          : 'allow',
      flags,
      reasons,
      filteredContext,
      delegation: {
        checks: delegationChecks,
        summary: simulatedBudget.summarize(),
      },
    };
  }

  _detectRepeatedAction(history = []) {
    const latest = history[history.length - 1]?.resolution?.action || null;
    if (!latest) {
      return null;
    }
    const count = history
      .slice()
      .reverse()
      .reduce((acc, entry) => {
        if (acc.stopped) {
          return acc;
        }
        if (entry?.resolution?.action === latest) {
          acc.count += 1;
        } else {
          acc.stopped = true;
        }
        return acc;
      }, { count: 0, stopped: false }).count;

    return count > this.maxRepeatedActionCount ? { action: latest, count } : null;
  }

  _detectForbiddenOverlap(assignments = []) {
    const byActor = assignments.reduce((acc, assignment) => {
      if (!assignment?.actor?.id) {
        return acc;
      }
      const actorId = assignment.actor.id;
      acc[actorId] = acc[actorId] || [];
      acc[actorId].push(assignment.role);
      return acc;
    }, {});

    for (const [actorId, roles] of Object.entries(byActor)) {
      for (const pair of this.forbiddenRoleOverlaps) {
        if (pair.every(role => roles.includes(role))) {
          return {
            actorId,
            roles: pair,
          };
        }
      }
    }

    return null;
  }
}

module.exports = { CoordinationSafetyGuard };
