const { SchemaSafety } = require('../runtime/SchemaSafety');
const { invokeWithDeadline } = require('../runtime/InvocationControl');
const { ToolExecutionError } = require('../errors');
const safety = new SchemaSafety();

function namespace(value = '') {
  value = value ?? '';
  if (typeof value !== 'string' || value.length > 1024) throw new TypeError('Invalid vector namespace.');
  return value;
}
function vector(values) {
  if (!Array.isArray(values) || !values.length || values.length > 65536 ||
      Array.from(values).some(value => !Number.isFinite(value))) {
    throw new TypeError('Invalid vector values.');
  }
}
function ids(values) {
  if (!Array.isArray(values) || values.length > 10000 || values.some(id => typeof id !== 'string' || !id || id.length > 1024)) {
    throw new TypeError('Invalid vector IDs.');
  }
}
function records(values) {
  if (!Array.isArray(values) || !values.length || values.length > 10000) throw new TypeError('Invalid vector batch.');
  ids(values.map(value => value.id));
  for (const value of values) {
    vector(value.values);
    if (value.values.length !== values[0].values.length) throw new TypeError('Mixed vector dimensions.');
    metadata(value.metadata);
  }
}
function metadata(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Vector metadata must be an object.');
  safety.assertValue(value);
  return JSON.parse(JSON.stringify(value));
}
function limit(topK = 5) {
  if (!Number.isSafeInteger(topK) || topK < 1 || topK > 10000) throw new TypeError('Invalid vector query limit.');
  return topK;
}

/** One portable filter subset; reject rather than silently dropping conditions. */
function filterTree(filter = {}) {
  safety.assertValue(filter);
  function parse(node) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) throw new TypeError('Invalid vector filter.');
    return { op: 'and', children: Object.entries(node).map(([key, value]) => {
      if (key === '$and' || key === '$or') {
        if (!Array.isArray(value) || !value.length) throw new TypeError('Empty vector filter combinator.');
        return { op: key.slice(1), children: value.map(parse) };
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new TypeError('Unsupported vector metadata key.');
      const conditions = value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : [['$eq', value]];
      if (!conditions.length) throw new TypeError('Empty vector filter condition.');
      return { op: 'and', children: conditions.map(([operator, operand]) => {
        if (!['$eq', '$ne', '$in', '$nin', '$exists'].includes(operator) ||
            (operator === '$exists' ? typeof operand !== 'boolean' :
              ['$in', '$nin'].includes(operator) ? !Array.isArray(operand) || operand.some(item => !['string', 'number', 'boolean'].includes(typeof item)) :
                !['string', 'number', 'boolean'].includes(typeof operand))) throw new TypeError('Unsupported vector filter condition.');
        return { op: operator.slice(1), key, value: operand };
      }) };
    }) };
  }
  return parse(filter);
}
function timeout(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647) throw new TypeError('Invalid vector timeout.');
  return value;
}
async function invoke(action, { timeoutMs, signal, write = false }) {
  try { return await invokeWithDeadline(action, { timeoutMs, signal }); }
  catch {
    const error = new ToolExecutionError('Vector backend operation did not complete.');
    error.retryable = false;
    error.uncertain = write;
    throw error;
  }
}
module.exports = { namespace, vector, ids, records, metadata, limit, filterTree, timeout, invoke };
