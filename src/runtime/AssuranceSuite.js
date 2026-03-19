const { EvalHarness } = require('./EvalHarness');
const { InvariantRegistry } = require('./InvariantRegistry');
const { AssuranceReport } = require('./AssuranceReport');

class AssuranceSuite {
  constructor({ invariants = null, scenarios = [] } = {}) {
    this.invariants =
      invariants instanceof InvariantRegistry ? invariants : new InvariantRegistry(invariants || {});
    this.scenarios = Array.isArray(scenarios) ? [...scenarios] : [];
  }

  async run(context = {}) {
    const invariantResults = await this.invariants.evaluate(context);
    const scenarioReport = await new EvalHarness({
      scenarios: this.scenarios,
    }).run();

    return new AssuranceReport({
      invariants: invariantResults,
      scenarios: scenarioReport.results || [],
    });
  }
}

module.exports = { AssuranceSuite };
