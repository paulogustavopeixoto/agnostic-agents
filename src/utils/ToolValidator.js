const Ajv = require('ajv');

function cleanSchemaForValidation(schema) {
  const cleaned = JSON.parse(JSON.stringify(schema));

  const stripAliases = (node) => {
    if (node && typeof node === 'object') {
      delete node.aliases;
      for (const key of Object.keys(node)) {
        stripAliases(node[key]);
      }
    }
  };

  stripAliases(cleaned);
  return cleaned;
}

class ToolValidator {
  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  /**
   * Validate arguments against tool's parameter schema.
   * @param {Tool} tool 
   * @param {object} args 
   * @returns {object} { valid, errors, missingFields }
   */
  validate(tool, args) {
    const schema = cleanSchemaForValidation(tool.parameters);

    const validate = this.ajv.compile(schema);
    const valid = validate(args);

    const missingFields = [];
    if (!valid && validate.errors) {
      for (const err of validate.errors) {
        if (err.keyword === 'required') {
          missingFields.push(err.params.missingProperty);
        }
      }
    }

    return {
      valid,
      errors: validate.errors || [],
      missingFields,
    };
  }
}

module.exports = { ToolValidator };