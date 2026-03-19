const { GovernanceRecordLedger } = require('./GovernanceRecordLedger');

class AuditStitcher {
  constructor({ ledger = null } = {}) {
    this.ledger = ledger instanceof GovernanceRecordLedger ? ledger : new GovernanceRecordLedger(ledger || {});
  }

  stitch(options = {}) {
    const records = this.ledger
      .list(options)
      .slice()
      .sort((left, right) => String(left.timestamp).localeCompare(String(right.timestamp)));

    return {
      correlationId: options.correlationId || null,
      candidateId: options.candidateId || null,
      runId: options.runId || null,
      records,
      surfaces: [...new Set(records.map(record => record.surface))],
      actions: [...new Set(records.map(record => record.action))],
      links: records.slice(1).map((record, index) => ({
        fromId: records[index].id,
        toId: record.id,
        relation: 'governance_sequence',
      })),
    };
  }
}

module.exports = { AuditStitcher };
