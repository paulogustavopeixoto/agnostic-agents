const { ApprovalDelegationContract } = require('./ApprovalDelegationContract');

class FederatedDelegationLedger {
  constructor({ records = [] } = {}) {
    this.records = Array.isArray(records) ? records.map(record => normalizeRecord(record)) : [];
  }

  record(entry = {}) {
    const record = normalizeRecord(entry, this.records.length + 1);
    this.records.push(record);
    return record;
  }

  list(filters = {}) {
    return this.records.filter(record => {
      if (filters.organizationId && record.organizationId !== filters.organizationId) {
        return false;
      }
      if (filters.delegateOrganizationId && record.delegateOrganizationId !== filters.delegateOrganizationId) {
        return false;
      }
      if (filters.type && record.type !== filters.type) {
        return false;
      }
      if (filters.candidateId && record.candidateId !== filters.candidateId) {
        return false;
      }
      return true;
    });
  }

  summarize() {
    return {
      total: this.records.length,
      byType: countBy(this.records, 'type'),
      byOrganization: countBy(this.records, 'organizationId'),
      byDelegateOrganization: countBy(this.records, 'delegateOrganizationId'),
      jurisdictions: [...new Set(this.records.flatMap(record => record.jurisdictions || []).filter(Boolean))],
    };
  }
}

function normalizeRecord(entry = {}, index = 1) {
  const contract = entry.contract instanceof ApprovalDelegationContract
    ? entry.contract.toJSON()
    : entry.contract || null;

  return {
    id: entry.id || `federated-delegation:${index}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    type: entry.type || 'approval_delegation',
    organizationId: entry.organizationId || 'local-org',
    delegateOrganizationId: entry.delegateOrganizationId || null,
    candidateId: entry.candidateId || null,
    jurisdictions: Array.isArray(entry.jurisdictions) ? [...entry.jurisdictions] : [],
    environments: Array.isArray(entry.environments) ? [...entry.environments] : [],
    status: entry.status || 'active',
    contract,
    metadata: entry.metadata || {},
  };
}

function countBy(entries, key) {
  return entries.reduce((accumulator, entry) => {
    const value = entry[key] || 'unknown';
    accumulator[value] = (accumulator[value] || 0) + 1;
    return accumulator;
  }, {});
}

module.exports = { FederatedDelegationLedger };
