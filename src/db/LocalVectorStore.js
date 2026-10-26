// src/db/LocalVectorStore.js
const { SchemaSafety } = require('../runtime/SchemaSafety');

class LocalVectorStore {
    constructor() {
      this.vectors = new Map(); // { id: { values, metadata } }
      this.namespaces = new Map([['', this.vectors]]);
      this.capabilities = { namespaceIsolation: true };
      this.safety = new SchemaSafety();
    }

    _namespace(namespace = '') {
      namespace = namespace ?? '';
      if (typeof namespace !== 'string') throw new TypeError('Invalid vector namespace.');
      if (!this.namespaces.has(namespace)) this.namespaces.set(namespace, new Map());
      return this.namespaces.get(namespace);
    }

    _vector(values) {
      if (!Array.isArray(values) || !values.length || Array.from(values).some(value => !Number.isFinite(value))) {
        throw new TypeError('Vectors must contain finite numbers.');
      }
    }

    _matches(metadata, filter) {
      return Object.entries(filter).every(([key, expected]) => {
        if (key === '$and' || key === '$or') {
          if (!Array.isArray(expected) || expected.some(item => !item || typeof item !== 'object')) throw new Error('Invalid vector filter.');
          return key === '$and' ? expected.every(item => this._matches(metadata, item)) : expected.some(item => this._matches(metadata, item));
        }
        if (key.startsWith('$')) throw new Error('Unsupported vector filter operator.');
        const actual = Object.hasOwn(metadata, key) ? metadata[key] : undefined;
        if (expected && typeof expected === 'object') {
          return Object.entries(expected).every(([operator, value]) => {
            if (operator === '$eq') return actual === value;
            if (operator === '$ne') return actual !== value;
            if (operator === '$exists') return value === (actual !== undefined);
            if (operator === '$in' && Array.isArray(value)) return value.includes(actual);
            if (operator === '$nin' && Array.isArray(value)) return !value.includes(actual);
            throw new Error('Unsupported vector filter operator.');
          });
        }
        return actual === expected;
      });
    }
  
    async upsert({ vectors, namespace = '' }) {
      const records = this._namespace(namespace);
      const dimension = records.values().next().value?.values.length || vectors[0]?.values?.length;
      for (const vector of vectors) {
        this._vector(vector.values);
        if (typeof vector.id !== 'string' || !vector.id || vector.values.length !== dimension) throw new TypeError('Invalid vector record.');
        this.safety.assertValue(vector.metadata || {});
      }
      const insertedIds = vectors.map(v => {
        records.set(v.id, { values: [...v.values], metadata: JSON.parse(JSON.stringify(v.metadata || {})) });
        return v.id;
      });
      return { insertedIds };
    }
  
    async query({ vector, topK = 5, namespace = '', filter = {} }) {
      this._vector(vector);
      if (!Number.isSafeInteger(topK) || topK < 1 || topK > 10000) throw new TypeError('Invalid topK.');
      this.safety.assertValue(filter);
      const matches = [];
      for (const [id, { values, metadata }] of this._namespace(namespace)) {
        if (!this._matches(metadata, filter)) continue;
        if (values.length !== vector.length) throw new Error('Vector dimensions differ.');
        const score = this._cosineSimilarity(vector, values);
        matches.push({ id, score, metadata: JSON.parse(JSON.stringify(metadata)) });
      }
      matches.sort((a, b) => b.score - a.score);
      return { matches: matches.slice(0, topK) };
    }
  
    async delete({ ids, namespace = '' }) {
      ids.forEach(id => this._namespace(namespace).delete(id));
    }
  
    async deleteAll({ namespace = '' } = {}) {
      this._namespace(namespace).clear();
    }
  
    _cosineSimilarity(vecA, vecB) {
      const scaleA = vecA.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
      const scaleB = vecB.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
      if (!scaleA || !scaleB) return 0;
      let dot = 0, sumA = 0, sumB = 0;
      for (let index = 0; index < vecA.length; index++) {
        const a = vecA[index] / scaleA, b = vecB[index] / scaleB;
        dot += a * b; sumA += a * a; sumB += b * b;
      }
      return Math.max(-1, Math.min(1, dot / Math.sqrt(sumA * sumB)));
    }
  }
  
  module.exports = { LocalVectorStore };
