class SharedContextScope {
  constructor({ roleScopes = {}, redactedValue = '[redacted]' } = {}) {
    this.roleScopes = { ...roleScopes };
    this.redactedValue = redactedValue;
  }

  filter(role, context = {}) {
    const allowedKeys = Array.isArray(this.roleScopes[role]) ? this.roleScopes[role] : null;
    if (!allowedKeys) {
      return {
        role,
        allowedKeys: null,
        context: { ...context },
        redactedKeys: [],
      };
    }

    const filtered = {};
    const redactedKeys = [];
    for (const [key, value] of Object.entries(context || {})) {
      if (allowedKeys.includes(key)) {
        filtered[key] = value;
      } else {
        redactedKeys.push(key);
      }
    }

    return {
      role,
      allowedKeys: [...allowedKeys],
      context: filtered,
      redactedKeys,
    };
  }
}

module.exports = { SharedContextScope };
