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
    ],
  } = {}) {
    this.replacement = replacement;
    this.sensitiveKeys = new Set(sensitiveKeys.map(key => String(key).toLowerCase()));
  }

  /**
   * Recursively redacts sensitive keys from a structured payload.
   *
   * @param {*} value
   * @returns {*}
   */
  redact(value) {
    if (Array.isArray(value)) {
      return value.map(item => this.redact(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (this._isSensitiveKey(key)) {
        output[key] = this.replacement;
        continue;
      }

      output[key] = this.redact(entry);
    }

    return output;
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
