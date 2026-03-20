const { FleetHealthMonitor } = require('./FleetHealthMonitor');
const { AutonomyBudgetLedger } = require('./AutonomyBudgetLedger');

class AutonomyFleetSummary {
  constructor({ monitor = null, budgetLedger = null } = {}) {
    this.monitor = monitor instanceof FleetHealthMonitor ? monitor : new FleetHealthMonitor(monitor || {});
    this.budgetLedger =
      budgetLedger instanceof AutonomyBudgetLedger ? budgetLedger : new AutonomyBudgetLedger(budgetLedger || {});
  }

  summarize({ escalations = [] } = {}) {
    const fleet = this.monitor.summarize();
    const budgetLedger = this.budgetLedger.summarize();
    const escalationHotspots = Array.isArray(escalations)
      ? escalations.reduce((acc, item) => {
          const key = item.environment || item.tenant || item.taskFamily || 'unknown';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      : {};

    return {
      fleet,
      budgets: budgetLedger,
      escalationHotspots,
    };
  }
}

module.exports = { AutonomyFleetSummary };
