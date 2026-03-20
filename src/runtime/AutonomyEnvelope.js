const { AutonomyBudget } = require('./AutonomyBudget');
const { UncertaintySupervisionPolicy } = require('./UncertaintySupervisionPolicy');

class AutonomyEnvelope {
  constructor({
    budget = null,
    supervisionPolicy = null,
    environment = null,
    tenant = null,
    metadata = {},
  } = {}) {
    this.budget = budget instanceof AutonomyBudget ? budget : new AutonomyBudget(budget || {});
    this.supervisionPolicy =
      supervisionPolicy instanceof UncertaintySupervisionPolicy
        ? supervisionPolicy
        : new UncertaintySupervisionPolicy(supervisionPolicy || {});
    this.environment = environment;
    this.tenant = tenant;
    this.metadata = metadata;
  }

  evaluate({ usage = {}, assessment = {}, riskClass = 'low' } = {}) {
    const budgetSnapshot = this.budget.record(usage);
    const supervision = this.supervisionPolicy.evaluate({
      ...assessment,
      riskClass,
    });

    if (budgetSnapshot.exhausted) {
      return {
        action: 'halt',
        reason: 'Autonomy budget exhausted.',
        budget: budgetSnapshot,
        supervision,
      };
    }

    if (supervision.action !== 'allow') {
      return {
        action: supervision.action,
        reason: supervision.reason,
        budget: budgetSnapshot,
        supervision,
      };
    }

    return {
      action: 'allow',
      reason: null,
      budget: budgetSnapshot,
      supervision,
    };
  }
}

module.exports = { AutonomyEnvelope };
