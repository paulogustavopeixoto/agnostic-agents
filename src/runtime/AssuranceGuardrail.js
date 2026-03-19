const { AssuranceReport } = require('./AssuranceReport');

class AssuranceGuardrail {
  evaluate(report = {}) {
    const assuranceReport = report instanceof AssuranceReport ? report : new AssuranceReport(report || {});
    const explanation = assuranceReport.explain();

    return {
      action: explanation.verdict === 'block' ? 'block_rollout' : 'allow_rollout',
      violations: explanation.violations,
      operatorSummary: explanation.operatorSummary,
    };
  }
}

module.exports = { AssuranceGuardrail };
