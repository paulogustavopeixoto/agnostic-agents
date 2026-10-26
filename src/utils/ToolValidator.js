// src/utils/ToolValidator.js
const Ajv = require('ajv');
const { SchemaSafety } = require('../runtime/SchemaSafety');

class ToolValidator {
  constructor({ schemaSafety = {} } = {}) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    this.cache = new WeakMap();
    this.outputCache = new WeakMap();
    this.safety = schemaSafety instanceof SchemaSafety ? schemaSafety : new SchemaSafety(schemaSafety);
  }

  /**
   * Validate arguments against the tool's JSON schema.
   * Supports nested validation.
   */
  validate(tool, args = {}) {
    this.safety.assertValue(args);
    this.safety.assertSchema(tool.parameters);
    const schemaText = JSON.stringify(tool.parameters);
    let cached = this.cache.get(tool);
    if (!cached || cached.schemaText !== schemaText) {
      if (cached) this.ajv.removeSchema(cached.schema);
      const schema = JSON.parse(schemaText);
      cached = { schemaText, schema, validate: this.ajv.compile(schema) };
      this.cache.set(tool, cached);
    }
    const validate = cached.validate;
    const valid = validate(args);

    const errors = validate.errors || [];
    const missingFields = errors
      .filter(err => err.keyword === 'required')
      .map(err => this.formatAjvPath(err));

    return {
      valid,
      errors,
      missingFields,
    };
  }

  /**
   * Converts AJV error paths to readable dot notation.
   */
  formatAjvPath(err) {
    const path = (err.instancePath || '')
      .split('/')
      .filter(Boolean)
      .join('.');
    const field = err.params?.missingProperty;
    return path ? `${path}.${field}` : field;
  }

  validateOutput(tool, output) {
    if (tool.outputSchema == null) return { valid: true, errors: [] };
    this.safety.assertValue(output);
    this.safety.assertSchema(tool.outputSchema);
    const schemaText = JSON.stringify(tool.outputSchema);
    let cached = this.outputCache.get(tool);
    if (!cached || cached.schemaText !== schemaText) {
      if (cached) this.ajv.removeSchema(cached.schema);
      const schema = JSON.parse(schemaText);
      cached = { schemaText, schema, validate: this.ajv.compile(schema) };
      this.outputCache.set(tool, cached);
    }
    return { valid: cached.validate(output), errors: cached.validate.errors || [] };
  }
}

module.exports = { ToolValidator };
