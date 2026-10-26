const { createHmac, timingSafeEqual } = require('crypto');

function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value))) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  throw new TypeError('Approval binding must be JSON.');
}

class ApprovalSigner {
  constructor({ key } = {}) {
    if (!(typeof key === 'string' || key instanceof Uint8Array) || Buffer.byteLength(key) < 32) {
      throw new TypeError('Approval signing key must contain at least 32 bytes.');
    }
    this.key = Buffer.from(key);
  }

  sign(request) {
    const binding = Object.fromEntries(['id', 'runId', 'toolName', 'createdAt', 'expiresAt',
      'toolCall', 'arguments', 'metadata', 'scopeKey', 'toolSchema', 'toolOutputSchema']
      .map(key => [key, request[key] ?? null]));
    return createHmac('sha256', this.key).update(canonical(binding)).digest('hex');
  }

  verify(request) {
    if (typeof request?.signature !== 'string' || !/^[a-f0-9]{64}$/.test(request.signature)) return false;
    try {
      return timingSafeEqual(Buffer.from(request.signature, 'hex'), Buffer.from(this.sign(request), 'hex'));
    } catch { return false; }
  }
}

module.exports = { ApprovalSigner };
