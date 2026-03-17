/**
 * Confidence-aware execution policy for low-confidence tool calls and final
 * outputs. This keeps confidence thresholds explicit and host-controlled.
 */
class ConfidencePolicy {
  /**
   * @param {object} [options]
   * @param {number} [options.toolApprovalThreshold]
   * @param {number} [options.runPauseThreshold]
   * @param {string[]} [options.riskySideEffects]
   * @param {Function|null} [options.evaluateTool]
   * @param {Function|null} [options.evaluateRun]
   */
  constructor({
    toolApprovalThreshold = 0.6,
    runPauseThreshold = 0.55,
    riskySideEffects = ['external_write', 'system_write', 'destructive'],
    evaluateTool = null,
    evaluateRun = null,
  } = {}) {
    this.toolApprovalThreshold = toolApprovalThreshold;
    this.runPauseThreshold = runPauseThreshold;
    this.riskySideEffects = Array.isArray(riskySideEffects) ? [...riskySideEffects] : [];
    this.customEvaluateTool = evaluateTool;
    this.customEvaluateRun = evaluateRun;
  }

  evaluateTool(tool, toolAssessment, context = {}) {
    if (typeof this.customEvaluateTool === 'function') {
      return this.customEvaluateTool(tool, toolAssessment, context);
    }

    const sideEffectLevel = tool?.metadata?.sideEffectLevel || 'none';
    if (
      this.riskySideEffects.includes(sideEffectLevel) &&
      typeof toolAssessment?.score === 'number' &&
      toolAssessment.score < this.toolApprovalThreshold
    ) {
      return {
        action: 'require_approval',
        reason: `Tool confidence ${toolAssessment.score} is below the approval threshold ${this.toolApprovalThreshold}.`,
        source: 'confidence_policy',
      };
    }

    return { action: 'allow', reason: null, source: 'confidence_policy' };
  }

  evaluateRun(run, assessment, context = {}) {
    if (typeof this.customEvaluateRun === 'function') {
      return this.customEvaluateRun(run, assessment, context);
    }

    if (
      typeof assessment?.confidence === 'number' &&
      assessment.confidence < this.runPauseThreshold
    ) {
      return {
        action: 'pause',
        reason: `Run confidence ${assessment.confidence} is below the pause threshold ${this.runPauseThreshold}.`,
        source: 'confidence_policy',
      };
    }

    return { action: 'allow', reason: null, source: 'confidence_policy' };
  }
}

module.exports = { ConfidencePolicy };
