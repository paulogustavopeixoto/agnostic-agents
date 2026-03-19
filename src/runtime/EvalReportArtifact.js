class EvalReportArtifact {
  static get FORMAT() {
    return 'agnostic-agents-eval-report';
  }

  static get SCHEMA_VERSION() {
    return '1.0';
  }

  constructor({ report = null, metadata = {} } = {}) {
    this.report = report ? JSON.parse(JSON.stringify(report)) : null;
    this.metadata = { ...metadata };
  }

  summarize() {
    return {
      total: this.report?.total || 0,
      passed: this.report?.passed || 0,
      failed: this.report?.failed || 0,
      metadata: this.metadata,
    };
  }

  toJSON() {
    return {
      format: EvalReportArtifact.FORMAT,
      schemaVersion: EvalReportArtifact.SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      metadata: { ...this.metadata },
      report: this.report ? JSON.parse(JSON.stringify(this.report)) : null,
      summary: this.summarize(),
    };
  }

  static fromJSON(payload = {}) {
    return new EvalReportArtifact({
      report: payload.report || null,
      metadata: payload.metadata || {},
    });
  }

  static fromReport(report = {}, metadata = {}) {
    return new EvalReportArtifact({
      report,
      metadata,
    });
  }
}

module.exports = { EvalReportArtifact };
