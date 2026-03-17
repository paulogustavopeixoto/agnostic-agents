class PolicyEvaluationRecord {
  static get SCHEMA_VERSION() {
    return '1.0';
  }

  static get FORMAT() {
    return 'agnostic-agents-policy-evaluation';
  }

  constructor({
    subject = {},
    report = null,
    metadata = {},
  } = {}) {
    this.subject = { ...subject };
    this.report = report;
    this.metadata = { ...metadata };
  }

  summarize() {
    return {
      subject: this.subject,
      summary: this.report?.summary || null,
      explanations: this.report?.explanations || [],
      metadata: this.metadata,
    };
  }

  toJSON() {
    return {
      schemaVersion: PolicyEvaluationRecord.SCHEMA_VERSION,
      format: PolicyEvaluationRecord.FORMAT,
      exportedAt: new Date().toISOString(),
      subject: { ...this.subject },
      metadata: { ...this.metadata },
      report: this.report,
      summary: this.report?.summary || null,
      explanations: this.report?.explanations || [],
    };
  }

  static fromJSON(payload = {}) {
    return new PolicyEvaluationRecord({
      subject: payload.subject || {},
      report: payload.report || null,
      metadata: payload.metadata || {},
    });
  }
}

module.exports = { PolicyEvaluationRecord };
