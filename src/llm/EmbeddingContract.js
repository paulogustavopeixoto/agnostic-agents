const { ToolExecutionError } = require('../errors');
const { SchemaSafety } = require('../runtime/SchemaSafety');
const { vector } = require('../db/VectorContract');
const safety = new SchemaSafety({ maxNodes: 1000000, maxBytes: 64 * 1024 * 1024 });

/** Normalize one vector per input; never infer pooling or silently drop chunks. */
function normalizeEmbeddingBatch(batch, expectedCount) {
  try {
    if (!Number.isSafeInteger(expectedCount) || expectedCount < 1 || expectedCount > 10000 ||
        !Array.isArray(batch) || batch.length !== expectedCount) throw new Error();
    safety.assertValue(batch);
    const indexed = batch.some(record => record && !Array.isArray(record) && Object.hasOwn(record, 'index'));
    const result = new Array(expectedCount);
    let dimensions;
    for (let position = 0; position < batch.length; position++) {
      const record = batch[position];
      const values = Array.isArray(record) ? record : record?.embedding;
      vector(values);
      dimensions ??= values.length;
      if (values.length !== dimensions) throw new Error();
      const index = indexed ? record?.index : position;
      if (!Number.isSafeInteger(index) || index < 0 || index >= expectedCount || result[index]) throw new Error();
      result[index] = { embedding: [...values] };
    }
    return result;
  } catch {
    const error = new ToolExecutionError('Embedding batch violates the count, index, dimension or finite-vector contract.');
    error.retryable = false;
    throw error;
  }
}

module.exports = { normalizeEmbeddingBatch };
