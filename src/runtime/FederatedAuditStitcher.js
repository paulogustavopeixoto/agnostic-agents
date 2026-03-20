const { GovernanceRecordLedger } = require('./GovernanceRecordLedger');
const { FederatedDelegationLedger } = require('./FederatedDelegationLedger');

class FederatedAuditStitcher {
  constructor({ ledgers = [], delegationLedger = null } = {}) {
    this.ledgers = ledgers.map(entry => ({
      source: entry.source || 'local',
      ledger: entry.ledger instanceof GovernanceRecordLedger
        ? entry.ledger
        : new GovernanceRecordLedger(entry.ledger || {}),
    }));
    this.delegationLedger = delegationLedger instanceof FederatedDelegationLedger
      ? delegationLedger
      : new FederatedDelegationLedger(delegationLedger || {});
  }

  stitch(filters = {}) {
    const governanceRecords = this.ledgers.flatMap(entry =>
      entry.ledger.list(filters).map(record => ({
        ...record,
        source: entry.source,
        recordKind: 'governance',
      }))
    );
    const delegationRecords = this.delegationLedger.list(filters).map(record => ({
      ...record,
      source: 'federation',
      recordKind: 'delegation',
      surface: 'federation',
      action: record.type,
    }));

    const records = [...governanceRecords, ...delegationRecords].sort((left, right) =>
      String(left.timestamp).localeCompare(String(right.timestamp))
    );

    return {
      candidateId: filters.candidateId || null,
      correlationId: filters.correlationId || null,
      runId: filters.runId || null,
      records,
      sources: [...new Set(records.map(record => record.source))],
      jurisdictions: [...new Set(records.flatMap(record => record.jurisdictions || []).filter(Boolean))],
      organizations: [...new Set(records.flatMap(record => [record.organizationId, record.delegateOrganizationId]).filter(Boolean))],
      links: records.slice(1).map((record, index) => ({
        fromId: records[index].id,
        toId: record.id,
        relation: 'federated_governance_sequence',
      })),
    };
  }
}

module.exports = { FederatedAuditStitcher };
