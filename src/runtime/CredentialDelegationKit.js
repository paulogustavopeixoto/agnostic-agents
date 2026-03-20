class CredentialDelegationKit {
  issue({
    principal,
    scope = [],
    expiresAt = null,
    metadata = {},
  } = {}) {
    if (!principal) {
      throw new Error('CredentialDelegationKit.issue requires principal.');
    }

    return {
      kind: 'agnostic-agents/delegated-credential',
      version: '1.0.0',
      principal,
      scope,
      expiresAt,
      metadata,
    };
  }

  validate(credential = {}, { now = new Date() } = {}) {
    if (!credential.principal) {
      return { valid: false, reason: 'missing_principal' };
    }
    if (credential.expiresAt && new Date(credential.expiresAt).getTime() < now.getTime()) {
      return { valid: false, reason: 'expired' };
    }
    return { valid: true, reason: null };
  }
}

module.exports = { CredentialDelegationKit };
