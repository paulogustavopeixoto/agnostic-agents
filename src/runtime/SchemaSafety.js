const { ToolPolicyError } = require('../errors');

class SchemaSafety {
  constructor({ maxDepth = 32, maxNodes = 10000, maxBytes = 1024 * 1024,
    allowPatterns = false, allowLocalRefs = false } = {}) {
    if ([maxDepth, maxNodes, maxBytes].some(value => !Number.isSafeInteger(value) || value < 1)) {
      throw new TypeError('Invalid schema safety limits.');
    }
    Object.assign(this, { maxDepth, maxNodes, maxBytes, allowPatterns: allowPatterns === true });
    this.allowLocalRefs = allowLocalRefs === true;
  }

  assertValue(value) {
    let nodes = 0;
    let bytes = 0;
    const ancestors = new WeakSet();
    const visit = (entry, depth) => {
      if (++nodes > this.maxNodes || depth > this.maxDepth) throw new ToolPolicyError('JSON complexity limit exceeded.');
      bytes += 4;
      if (typeof entry === 'string') bytes += Buffer.byteLength(entry);
      if (entry && typeof entry === 'object') {
        if (Array.isArray(entry) && entry.length > this.maxNodes) throw new ToolPolicyError('JSON array limit exceeded.');
        if (ancestors.has(entry) || (!Array.isArray(entry) &&
            ![Object.prototype, null].includes(Object.getPrototypeOf(entry)))) {
          throw new ToolPolicyError('JSON contains cyclic or non-plain data.');
        }
        ancestors.add(entry);
        for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(entry))) {
          if (Array.isArray(entry) && key === 'length') continue;
          if (descriptor.get || descriptor.set) throw new ToolPolicyError('JSON accessors are not allowed.');
          bytes += Buffer.byteLength(key);
          visit(descriptor.value, depth + 1);
        }
        ancestors.delete(entry);
      } else if (typeof entry === 'function' || typeof entry === 'symbol' || typeof entry === 'bigint' ||
          (typeof entry === 'number' && !Number.isFinite(entry))) {
        throw new ToolPolicyError('Invalid JSON value.');
      }
      if (bytes > this.maxBytes) throw new ToolPolicyError('JSON size limit exceeded.');
    };
    visit(value, 0);
  }

  assertSchema(schema) {
    this.assertValue(schema);
    const visit = node => {
      if (!node || typeof node !== 'object') return;
      if (!this.allowPatterns && (node.pattern !== undefined || node.patternProperties !== undefined)) {
        throw new ToolPolicyError('Schema regex patterns require explicit host opt-in.');
      }
      for (const key of ['$ref', '$recursiveRef', '$dynamicRef']) {
        if (node[key] !== undefined && (typeof node[key] !== 'string' || !node[key].startsWith('#'))) {
          throw new ToolPolicyError('External schema references are not allowed.');
        }
        if (node[key] !== undefined && (key !== '$ref' || !this.allowLocalRefs)) {
          throw new ToolPolicyError('Schema references require explicit host review.');
        }
      }
      if (node.$data !== undefined) throw new ToolPolicyError('Dynamic schema data is not allowed.');
      for (const key of ['properties', 'patternProperties', '$defs', 'definitions', 'dependentSchemas']) {
        for (const child of Object.values(node[key] || {})) visit(child);
      }
      for (const child of Object.values(node.dependencies || {})) {
        if (!Array.isArray(child)) visit(child);
      }
      for (const key of ['allOf', 'anyOf', 'oneOf', 'prefixItems']) {
        for (const child of node[key] || []) visit(child);
      }
      for (const key of ['items', 'additionalProperties', 'propertyNames', 'contains', 'not', 'if',
        'then', 'else', 'unevaluatedProperties', 'unevaluatedItems', 'additionalItems']) {
        if (Array.isArray(node[key])) node[key].forEach(visit);
        else visit(node[key]);
      }
    };
    visit(schema);
  }
}

module.exports = { SchemaSafety };
