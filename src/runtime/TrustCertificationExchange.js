class TrustCertificationExchange {
  static publish({
    source = 'local-control-plane',
    certifications = [],
    trustSignals = [],
  } = {}) {
    return {
      kind: 'agnostic-agents/trust-certification-exchange',
      version: '1.0.0',
      source,
      certifications: [...certifications],
      trustSignals: [...trustSignals],
      summary: {
        source,
        certificationCount: certifications.length,
        trustSignalCount: trustSignals.length,
        targets: [...new Set([
          ...certifications.map(entry => entry.target).filter(Boolean),
          ...trustSignals.map(entry => entry.target).filter(Boolean),
        ])],
      },
    };
  }

  static merge(exchanges = []) {
    const normalized = exchanges.filter(Boolean);
    return {
      kind: 'agnostic-agents/trust-certification-exchange-merge',
      version: '1.0.0',
      exchanges: normalized,
      summary: {
        exchangeCount: normalized.length,
        sources: [...new Set(normalized.map(exchange => exchange.source).filter(Boolean))],
        certificationCount: normalized.reduce((sum, exchange) => sum + (exchange.certifications || []).length, 0),
        trustSignalCount: normalized.reduce((sum, exchange) => sum + (exchange.trustSignals || []).length, 0),
      },
    };
  }
}

module.exports = { TrustCertificationExchange };
