/**
 * Runs structured critiques against a candidate artifact without collapsing
 * those critiques into free-form text that operators cannot inspect later.
 */
class CritiqueProtocol {
  /**
   * @param {object} [options]
   * @param {Array<Function|object>} [options.reviewers]
   * @param {Array<string>} [options.failureTypes]
   * @param {object|null} [options.schemaRegistry]
   */
  constructor({
    reviewers = [],
    failureTypes = ['reasoning', 'grounding', 'tooling', 'policy', 'completeness', 'format'],
    schemaRegistry = null,
  } = {}) {
    this.reviewers = Array.isArray(reviewers) ? [...reviewers] : [];
    this.failureTypes = new Set(failureTypes);
    this.schemaRegistry = schemaRegistry;
  }

  /**
   * Run all configured reviewers against a candidate.
   *
   * @param {object} candidate
   * @param {object} [context]
   * @returns {Promise<object>}
   */
  async review(candidate = {}, context = {}) {
    const critiques = [];

    for (const reviewer of this.reviewers) {
      const raw = await this._invokeReviewer(reviewer, candidate, context);
      if (!raw) {
        continue;
      }

      const items = Array.isArray(raw) ? raw : [raw];
      for (const item of items) {
        critiques.push(this.normalizeCritique(item, candidate, context, reviewer));
      }
    }

    return {
      candidateId: candidate.id || context.candidateId || null,
      critiques,
      summary: this.summarize(critiques),
    };
  }

  /**
   * Normalize a critique into a predictable schema.
   *
   * @param {object} critique
   * @param {object} [candidate]
   * @param {object} [context]
   * @param {Function|object|null} [reviewer]
   * @returns {object}
   */
  normalizeCritique(critique = {}, candidate = {}, context = {}, reviewer = null) {
    const schema = this.schemaRegistry?.resolve(candidate, context) || null;
    const allowedFailureTypes = new Set([
      ...this.failureTypes,
      ...(schema?.allowedFailureTypes || []),
      'general',
    ]);
    const taxonomyDefaults = schema?.taxonomy?.[critique.failureType] || null;
    const failureType = allowedFailureTypes.has(critique.failureType)
      ? critique.failureType
      : schema?.defaultFailureType || 'general';
    const severity = ['low', 'medium', 'high', 'critical'].includes(critique.severity)
      ? critique.severity
      : taxonomyDefaults?.severity || 'medium';
    const verdict = ['accept', 'revise', 'reject', 'escalate'].includes(critique.verdict)
      ? critique.verdict
      : taxonomyDefaults?.verdict || 'revise';
    const recommendedAction = [
      'accept',
      'retry',
      'revise',
      'reject',
      'escalate',
      'branch_and_retry',
    ].includes(critique.recommendedAction)
      ? critique.recommendedAction
      : taxonomyDefaults?.recommendedAction ||
        (verdict === 'accept'
          ? 'accept'
          : verdict === 'reject'
            ? 'reject'
            : verdict === 'escalate'
              ? 'escalate'
              : 'revise');
    const requiredEvidence = [
      ...(taxonomyDefaults?.requiredEvidence || []),
      ...((critique.metadata && Array.isArray(critique.metadata.requiredEvidence))
        ? critique.metadata.requiredEvidence
        : []),
    ];

    return {
      criticId:
        critique.criticId ||
        reviewer?.id ||
        reviewer?.name ||
        reviewer?.constructor?.name ||
        'anonymous_critic',
      candidateId: critique.candidateId || candidate.id || context.candidateId || null,
      verdict,
      failureType,
      severity,
      confidence:
        typeof critique.confidence === 'number'
          ? Number(Math.max(0, Math.min(1, critique.confidence)).toFixed(3))
          : 0.5,
      recommendedAction,
      rationale: critique.rationale || critique.reason || null,
      evidence: critique.evidence || {},
      metadata: {
        taskFamily:
          context.taskFamily ||
          candidate.taskFamily ||
          candidate.taskType ||
          candidate.metadata?.taskFamily ||
          null,
        requiredEvidence,
        ...(schema?.metadata || {}),
        ...(taxonomyDefaults?.metadata || {}),
        ...(critique.metadata || {}),
      },
    };
  }

  /**
   * Summarize a critique set for downstream resolution.
   *
   * @param {Array<object>} critiques
   * @returns {object}
   */
  summarize(critiques = []) {
    const verdictCounts = {};
    const severityCounts = {};
    const failureCounts = {};

    for (const critique of critiques) {
      verdictCounts[critique.verdict] = (verdictCounts[critique.verdict] || 0) + 1;
      severityCounts[critique.severity] = (severityCounts[critique.severity] || 0) + 1;
      failureCounts[critique.failureType] = (failureCounts[critique.failureType] || 0) + 1;
    }

    return {
      total: critiques.length,
      verdictCounts,
      severityCounts,
      failureCounts,
      disagreement: new Set(critiques.map(critique => critique.verdict)).size > 1,
      highestSeverity: ['critical', 'high', 'medium', 'low'].find(level => severityCounts[level] > 0) || null,
    };
  }

  async _invokeReviewer(reviewer, candidate, context) {
    if (typeof reviewer === 'function') {
      return reviewer(candidate, context);
    }

    if (reviewer?.review) {
      return reviewer.review(candidate, context);
    }

    return null;
  }
}

module.exports = { CritiqueProtocol };
