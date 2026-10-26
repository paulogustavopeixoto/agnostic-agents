/**
 * Shared runtime redactor used by maintained sinks to mask secret-like
 * and operator-sensitive fields before they are logged or persisted.
 */
class RuntimeEventRedactor {
  /**
   * @param {object} [options]
   * @param {string} [options.replacement]
   * @param {string[]} [options.sensitiveKeys]
   */
  constructor({
    replacement = '[REDACTED]',
    sensitiveKeys = [
      'authorization',
      'apiKey',
      'api_key',
      'auth',
      'authToken',
      'password',
      'secret',
      'token',
      'accessToken',
      'refreshToken',
      'sessionToken',
      'ssn',
      'email',
      'phone',
      'cookie',
      'set-cookie',
      'x-api-key',
      'proxy-authorization',
    ],
    secrets = [],
    maxDepth = 32,
  } = {}) {
    if (!Number.isInteger(maxDepth) || maxDepth < 1) throw new TypeError('Invalid redaction depth.');
    this.replacement = replacement;
    this.sensitiveKeys = new Set(sensitiveKeys.map(key => String(key).toLowerCase()));
    this.secrets = secrets.filter(value => typeof value === 'string' && value.length > 0)
      .sort((a, b) => b.length - a.length);
    this.maxDepth = maxDepth;
  }

  /**
   * Recursively redacts sensitive keys from a structured payload.
   *
   * @param {*} value
   * @returns {*}
   */
  redact(value) {
    return this._redact(value, new WeakSet(), 0);
  }

  _redact(value, ancestors, depth) {
    if (typeof value === 'string') {
      let text = value;
      for (const secret of this.secrets) text = text.split(secret).join(this.replacement);
      return text
        .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+\/-]+=*/gi, (_, scheme) => `${scheme} ${this.replacement}`)
        .replace(/([?&](?:api[_-]?key|access[_-]?token|token|secret|password)=)[^\s&#]*/gi,
          (_, prefix) => `${prefix}${this.replacement}`)
        .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, (_, prefix) => `${prefix}${this.replacement}@`);
    }
    if (!value || typeof value !== 'object') return value;
    if (Buffer.isBuffer(value) || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
      return this.replacement;
    }
    if (depth >= this.maxDepth || ancestors.has(value)) return this.replacement;
    ancestors.add(value);
    if (Array.isArray(value)) {
      const output = value.map(entry => this._redact(entry, ancestors, depth + 1));
      ancestors.delete(value);
      return output;
    }
    const entries = [];
    for (const [key, entry] of Object.entries(value)) {
      entries.push([key, this._isSensitiveKey(key) ? this.replacement :
        this._redact(entry, ancestors, depth + 1)]);
    }
    ancestors.delete(value);
    return Object.fromEntries(entries);
  }

  _isSensitiveKey(key) {
    const normalized = String(key).toLowerCase();
    if (this.sensitiveKeys.has(normalized)) {
      return true;
    }

    if (normalized.includes('token') || normalized.includes('secret') || normalized.includes('password')) {
      return true;
    }

    return false;
  }
}

module.exports = { RuntimeEventRedactor };
