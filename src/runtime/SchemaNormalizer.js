class SchemaNormalizer {
  static normalizeToolSchema(schema = {}) {
    return this.normalizeSchema(schema);
  }

  static normalizeApiProperty(property = {}) {
    return this.normalizeSchema(property);
  }

  static normalizeSchema(schema = {}) {
    const type = this._normalizeType(schema.type, schema);
    const normalized = {
      ...schema,
      type,
    };

    if (type === 'object') {
      normalized.properties = Object.fromEntries(
        Object.entries(schema.properties || {}).map(([key, value]) => [key, this.normalizeSchema(value)])
      );
      normalized.required = Array.isArray(schema.required) ? [...new Set(schema.required)] : [];
    }

    if (type === 'array') {
      normalized.items = this.normalizeSchema(schema.items || { type: 'string' });
    }

    if (normalized.description == null) {
      normalized.description = '';
    }

    return normalized;
  }

  static _normalizeType(type, schema) {
    const valid = ['string', 'number', 'integer', 'boolean', 'object', 'array'];
    const inferred = type || (schema.properties ? 'object' : schema.items ? 'array' : 'string');
    const lower = String(inferred).toLowerCase();
    return valid.includes(lower) ? lower : 'string';
  }
}

module.exports = { SchemaNormalizer };
