class SecretResolver {
  constructor({ providers = {}, env = process.env } = {}) {
    this.providers = providers;
    this.env = env;
  }

  resolve(value, context = {}) {
    if (typeof value === 'string') {
      return this._resolveString(value, context);
    }
    if (Array.isArray(value)) {
      return value.map(entry => this.resolve(entry, context));
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, this.resolve(entry, context)])
      );
    }
    return value;
  }

  redact(value) {
    if (typeof value === 'string') {
      return value.length > 8 ? `${value.slice(0, 3)}***${value.slice(-2)}` : '***';
    }
    if (Array.isArray(value)) {
      return value.map(entry => this.redact(entry));
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => {
          const shouldRedact = /token|secret|password|authorization|api[_-]?key/i.test(key);
          return [key, shouldRedact ? this.redact(String(entry ?? '')) : this.redact(entry)];
        })
      );
    }
    return value;
  }

  _resolveString(value, context) {
    return value.replace(/\$\{([^}]+)\}|{{\s*([^}]+)\s*}}/g, (_, envKey, providerKey) => {
      if (envKey) {
        return this.env[envKey] != null ? String(this.env[envKey]) : '';
      }

      const [providerName, secretKey] = String(providerKey).split('.', 2);
      if (secretKey && this.providers[providerName]) {
        return this.providers[providerName](secretKey, context);
      }

      if (context[providerKey] != null) {
        return String(context[providerKey]);
      }

      return this.env[providerKey] != null ? String(this.env[providerKey]) : '';
    });
  }
}

module.exports = { SecretResolver };
