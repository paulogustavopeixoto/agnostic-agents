class ExecutionIdentity {
  static normalize(identity = null) {
    if (!identity || typeof identity !== 'object') {
      return null;
    }

    const normalized = {
      actorId: identity.actorId || null,
      serviceId: identity.serviceId || null,
      tenantId: identity.tenantId || null,
      sessionId: identity.sessionId || null,
      scopes: Array.isArray(identity.scopes) ? [...new Set(identity.scopes)] : [],
    };

    const hasValue = Object.entries(normalized).some(([key, value]) =>
      key === 'scopes' ? value.length > 0 : value !== null
    );

    return hasValue ? normalized : null;
  }

  static annotateMetadata(metadata = {}, identity = null) {
    const normalized = ExecutionIdentity.normalize(identity);
    if (!normalized) {
      return { ...metadata };
    }

    return {
      ...metadata,
      executionIdentity: normalized,
    };
  }
}

module.exports = { ExecutionIdentity };
