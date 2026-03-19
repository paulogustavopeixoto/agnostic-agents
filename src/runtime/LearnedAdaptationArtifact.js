class LearnedAdaptationArtifact {
  static get FORMAT() {
    return 'agnostic-agents-learned-adaptation';
  }

  static get SCHEMA_VERSION() {
    return '1.0';
  }

  constructor({ proposal = {}, metadata = {} } = {}) {
    this.proposal = JSON.parse(JSON.stringify(proposal || {}));
    this.metadata = { ...metadata };
  }

  summarize() {
    return {
      id: this.proposal.id || null,
      changeType: this.proposal.changeType || null,
      targetSurface: this.proposal.targetSurface || null,
      priority: this.proposal.priority || null,
      evidenceKeys: Object.keys(this.proposal.evidence || {}),
      metadata: { ...this.metadata },
    };
  }

  toJSON() {
    return {
      format: LearnedAdaptationArtifact.FORMAT,
      schemaVersion: LearnedAdaptationArtifact.SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      metadata: { ...this.metadata },
      proposal: JSON.parse(JSON.stringify(this.proposal || {})),
      summary: this.summarize(),
    };
  }

  diff(other = {}) {
    const right = other instanceof LearnedAdaptationArtifact ? other.proposal : other.proposal || other;
    return {
      left: {
        id: this.proposal.id || null,
        changeType: this.proposal.changeType || null,
        targetSurface: this.proposal.targetSurface || null,
      },
      right: {
        id: right.id || null,
        changeType: right.changeType || null,
        targetSurface: right.targetSurface || null,
      },
      evidenceChanged: JSON.stringify(this.proposal.evidence || {}) !== JSON.stringify(right.evidence || {}),
      recommendationChanged:
        JSON.stringify(this.proposal.recommendedChange || {}) !== JSON.stringify(right.recommendedChange || {}),
      rollbackChanged: JSON.stringify(this.proposal.rollback || {}) !== JSON.stringify(right.rollback || {}),
    };
  }

  static fromJSON(payload = {}) {
    return new LearnedAdaptationArtifact({
      proposal: payload.proposal || {},
      metadata: payload.metadata || {},
    });
  }
}

module.exports = { LearnedAdaptationArtifact };
