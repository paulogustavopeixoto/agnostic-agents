const { GovernedImprovementLoop } = require('./GovernedImprovementLoop');
const { WorkflowOutcomeContract } = require('./WorkflowOutcomeContract');
const { OutcomeScorecard } = require('./OutcomeScorecard');

class GovernedOutcomeOptimizationLoop {
  constructor({
    improvementLoop = null,
    outcomeScorecard = null,
  } = {}) {
    this.improvementLoop =
      improvementLoop instanceof GovernedImprovementLoop
        ? improvementLoop
        : new GovernedImprovementLoop(improvementLoop || {});
    this.outcomeScorecard =
      outcomeScorecard instanceof OutcomeScorecard
        ? outcomeScorecard
        : new OutcomeScorecard(outcomeScorecard || {});
  }

  review({
    contract = null,
    scorecardInput = {},
    proposalInput = {},
  } = {}) {
    const resolvedContract = contract instanceof WorkflowOutcomeContract
      ? contract
      : new WorkflowOutcomeContract(contract || {});
    const scorecard = this.outcomeScorecard.evaluate(scorecardInput);
    const contractEvaluation = resolvedContract.evaluate({
      businessOutcomeMet: scorecard.outcomes.business.met,
      serviceOutcomeMet: scorecard.outcomes.service.met,
      overallScore: scorecard.overall,
    });
    const actionPlans = this.improvementLoop.buildActionPlans(proposalInput);

    return {
      contract: resolvedContract.toJSON(),
      contractEvaluation,
      scorecard,
      actionPlans,
      recommendation:
        contractEvaluation.passed && scorecard.overall >= 80 ? 'promote' : 'review_before_promotion',
    };
  }
}

module.exports = { GovernedOutcomeOptimizationLoop };
