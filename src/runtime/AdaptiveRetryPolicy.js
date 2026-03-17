const { LearningLoop } = require('./LearningLoop');

/**
 * Converts prior run and eval outcomes into retry/escalation decisions.
 */
class AdaptiveRetryPolicy {
  /**
   * @param {object} [options]
   * @param {LearningLoop|null} [options.learningLoop]
   * @param {number} [options.escalateAfterAttempt]
   */
  constructor({ learningLoop = null, escalateAfterAttempt = 0 } = {}) {
    this.learningLoop = learningLoop instanceof LearningLoop ? learningLoop : learningLoop;
    this.escalateAfterAttempt = escalateAfterAttempt;
  }

  onFailure(error, { attempt = 0, retries = 0, context = {} } = {}) {
    const summary = this.learningLoop?.summarize ? this.learningLoop.summarize() : {};
    const riskyOperation =
      ['external_write', 'system_write', 'destructive'].includes(context.sideEffectLevel) ||
      context.operation === 'tool_execution';
    const priorPressure =
      (summary.failedRuns || 0) > 0 ||
      (summary.failedEvaluations || 0) > 0 ||
      (summary.verificationFlags || 0) > 0;

    if (riskyOperation && priorPressure && attempt >= this.escalateAfterAttempt) {
      return {
        action: 'escalate',
        reason: 'Prior failures indicate operator review is safer than continuing automatic retries.',
      };
    }

    if (attempt < retries) {
      return { action: 'retry', reason: null };
    }

    return {
      action: 'fail',
      reason: error?.message || 'Retry budget exhausted.',
    };
  }
}

module.exports = { AdaptiveRetryPolicy };
