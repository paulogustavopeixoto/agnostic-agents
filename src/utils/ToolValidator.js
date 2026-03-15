// src/utils/ToolValidator.js
const Ajv = require('ajv');

class ToolValidator {
  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    this.cache = new WeakMap();
  }

  /**
   * Validate arguments against the tool's JSON schema.
   * Supports nested validation.
   */
  validate(tool, args = {}) {
    let validate = this.cache.get(tool);
    if (!validate) {
      validate = this.ajv.compile(tool.parameters);
      this.cache.set(tool, validate);
    }
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
}

module.exports = { ToolValidator };
