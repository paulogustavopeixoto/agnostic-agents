const { GovernanceRecordLedger } = require('./GovernanceRecordLedger');

class GovernanceTimeline {
  constructor({ ledger = null } = {}) {
    this.ledger = ledger instanceof GovernanceRecordLedger ? ledger : new GovernanceRecordLedger(ledger || {});
  }

  build(options = {}) {
    const records = this.ledger
      .list(options)
      .slice()
      .sort((left, right) => String(left.timestamp).localeCompare(String(right.timestamp)));

    return {
      correlationId: options.correlationId || null,
      candidateId: options.candidateId || null,
      entries: records.map(record => ({
        id: record.id,
        timestamp: record.timestamp,
        label: `${record.surface}:${record.action}`,
        summary: record.summary || null,
        actorId: record.actorId || null,
        runId: record.runId || null,
        candidateId: record.candidateId || null,
        status: record.status || null,
      })),
    };
  }

  render(timeline = {}) {
    return (timeline.entries || [])
      .map(
        entry =>
          `${entry.timestamp} ${entry.label}${entry.status ? ` [${entry.status}]` : ''}${
            entry.summary ? ` - ${entry.summary}` : ''
          }`
      )
      .join('\n');
  }
}

module.exports = { GovernanceTimeline };
