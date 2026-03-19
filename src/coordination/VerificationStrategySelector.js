const { TrustRegistry } = require('./TrustRegistry');

class VerificationStrategySelector {
  constructor({
    trustRegistry = null,
    thresholds = {},
  } = {}) {
    this.trustRegistry =
      trustRegistry instanceof TrustRegistry ? trustRegistry : new TrustRegistry(trustRegistry || {});
    this.thresholds = {
      multiPassRisk: 0.5,
      adversarialRisk: 0.8,
      failureRate: 0.25,
      disagreementRate: 0.3,
      lowVerifierTrust: 0.65,
      ...thresholds,
    };
  }

  select(task = {}, context = {}) {
    const risk = this._normalizeNumber(task.risk ?? context.risk, 0);
    const taskFamily =
      context.taskFamily || task.taskFamily || task.taskType || task.domain || 'general';
    const history = context.history || {};
    const failureRate = this._normalizeNumber(history.failureRate, 0);
    const disagreementRate = this._normalizeNumber(history.disagreementRate, 0);
    const evidenceConflicts = this._normalizeNumber(history.evidenceConflicts, 0);
    const verifierActorIds = Array.isArray(context.verifierActorIds) ? context.verifierActorIds : [];
    const verifierRanking = this.trustRegistry.rankActors(verifierActorIds, {
      taskFamily,
      role: 'verifier',
      domain: context.domain || taskFamily,
    });
    const strongestVerifierTrust = verifierRanking[0]?.score ?? 0.5;

    let strategy = 'single_pass';
    const reasons = [];

    if (
      risk >= this.thresholds.adversarialRisk ||
      disagreementRate >= this.thresholds.disagreementRate ||
      evidenceConflicts > 0 ||
      strongestVerifierTrust < this.thresholds.lowVerifierTrust
    ) {
      strategy = 'adversarial_cross_check';
      if (risk >= this.thresholds.adversarialRisk) reasons.push('risk exceeded adversarial threshold');
      if (disagreementRate >= this.thresholds.disagreementRate) reasons.push('recent disagreement rate is elevated');
      if (evidenceConflicts > 0) reasons.push('recent evidence conflicts were observed');
      if (strongestVerifierTrust < this.thresholds.lowVerifierTrust) reasons.push('verifier trust is below threshold');
    } else if (risk >= this.thresholds.multiPassRisk || failureRate >= this.thresholds.failureRate) {
      strategy = 'multi_pass_cross_check';
      if (risk >= this.thresholds.multiPassRisk) reasons.push('risk exceeded multi-pass threshold');
      if (failureRate >= this.thresholds.failureRate) reasons.push('recent failure rate is elevated');
    } else {
      reasons.push('task risk and history fit single-pass verification');
    }

    const phases = this._buildPhases(strategy);
    return {
      strategy,
      taskFamily,
      risk,
      reasons,
      verifierRanking,
      phases,
    };
  }

  _buildPhases(strategy) {
    if (strategy === 'adversarial_cross_check') {
      return [
        { id: 'primary_verifier', role: 'verifier', mode: 'primary' },
        { id: 'adversarial_review', role: 'critic', mode: 'adversarial' },
        { id: 'final_aggregation', role: 'aggregator', mode: 'synthesis' },
      ];
    }

    if (strategy === 'multi_pass_cross_check') {
      return [
        { id: 'primary_verifier', role: 'verifier', mode: 'primary' },
        { id: 'cross_check', role: 'critic', mode: 'cross_check' },
      ];
    }

    return [{ id: 'primary_verifier', role: 'verifier', mode: 'primary' }];
  }

  _normalizeNumber(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }
}

module.exports = { VerificationStrategySelector };
