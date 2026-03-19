const { TrustRegistry } = require('./TrustRegistry');

class CoordinationQualityTracker {
  constructor({
    trustRegistry = null,
    records = [],
  } = {}) {
    this.trustRegistry =
      trustRegistry instanceof TrustRegistry ? trustRegistry : new TrustRegistry(trustRegistry || {});
    this.records = Array.isArray(records) ? [...records] : [];
  }

  record(record = {}) {
    const entry = {
      actorId: record.actorId || 'unknown_actor',
      role: record.role || 'executor',
      domain: record.domain || 'general',
      taskFamily: record.taskFamily || null,
      qualityType: record.qualityType || this._defaultQualityType(record.role),
      success: record.success !== false,
      confidence: typeof record.confidence === 'number' ? record.confidence : null,
      retries: typeof record.retries === 'number' ? Math.max(0, record.retries) : 0,
      recoverySucceeded:
        typeof record.recoverySucceeded === 'boolean' ? record.recoverySucceeded : null,
      metadata: record.metadata || {},
    };

    this.records.push(entry);
    this.trustRegistry.recordOutcome({
      actorId: entry.actorId,
      role: entry.role,
      domain: entry.domain,
      taskFamily: entry.taskFamily,
      success: entry.success,
      confidence: entry.confidence,
      retries: entry.retries,
      recoverySucceeded: entry.recoverySucceeded,
      metadata: {
        qualityType: entry.qualityType,
        ...(entry.metadata || {}),
      },
    });

    return entry;
  }

  getQualityScore(actorId, { qualityType = null, role = null, domain = null, taskFamily = null } = {}) {
    const relevant = this.records.filter(
      record =>
        record.actorId === actorId &&
        (!qualityType || record.qualityType === qualityType) &&
        (!role || record.role === role) &&
        (!domain || record.domain === domain) &&
        (!taskFamily || record.taskFamily === taskFamily)
    );

    if (!relevant.length) {
      return 0.5;
    }

    const successRate = relevant.filter(record => record.success).length / relevant.length;
    const confidenceValues = relevant
      .map(record => record.confidence)
      .filter(value => typeof value === 'number');
    const confidenceScore = confidenceValues.length
      ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
      : 0.5;
    const retryPenalty = relevant.length
      ? relevant.reduce((sum, record) => sum + record.retries, 0) / relevant.length
      : 0;
    const normalizedRetryPenalty = Math.max(0.6, 1 - retryPenalty * 0.08);

    return Number((successRate * 0.6 + confidenceScore * 0.4).toFixed(3)) * normalizedRetryPenalty;
  }

  summarize() {
    return {
      totalRecords: this.records.length,
      verifierQuality: this._summarizeQualityType('verification'),
      executorQuality: this._summarizeQualityType('execution'),
      criticQuality: this._summarizeQualityType('critique'),
      aggregatorQuality: this._summarizeQualityType('aggregation'),
    };
  }

  getProfile(actorId) {
    const qualityTypes = [
      ...new Set(this.records.filter(record => record.actorId === actorId).map(record => record.qualityType)),
    ];

    return {
      actorId,
      quality: qualityTypes.map(qualityType => ({
        qualityType,
        score: this.getQualityScore(actorId, { qualityType }),
      })),
      trustProfile: this.trustRegistry.getProfile(actorId),
    };
  }

  _summarizeQualityType(qualityType) {
    const actorIds = [
      ...new Set(this.records.filter(record => record.qualityType === qualityType).map(record => record.actorId)),
    ];

    return actorIds
      .map(actorId => ({
        actorId,
        score: this.getQualityScore(actorId, { qualityType }),
      }))
      .sort((left, right) => right.score - left.score);
  }

  _defaultQualityType(role) {
    return {
      verifier: 'verification',
      executor: 'execution',
      critic: 'critique',
      aggregator: 'aggregation',
      planner: 'planning',
    }[role || 'executor'] || 'execution';
  }
}

module.exports = { CoordinationQualityTracker };
