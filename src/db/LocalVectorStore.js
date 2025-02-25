// src/db/LocalVectorStore.js
class LocalVectorStore {
    constructor() {
      this.vectors = new Map(); // { id: { values, metadata } }
    }
  
    async upsert({ vectors }) {
      const insertedIds = vectors.map(v => {
        this.vectors.set(v.id, { values: v.values, metadata: v.metadata });
        return v.id;
      });
      return { insertedIds };
    }
  
    async query({ vector, topK = 5 }) {
      const matches = [];
      for (const [id, { values, metadata }] of this.vectors) {
        const score = this._cosineSimilarity(vector, values);
        matches.push({ id, score, metadata });
      }
      matches.sort((a, b) => b.score - a.score);
      return { matches: matches.slice(0, topK) };
    }
  
    async delete({ ids }) {
      ids.forEach(id => this.vectors.delete(id));
    }
  
    async deleteAll() {
      this.vectors.clear();
    }
  
    _cosineSimilarity(vecA, vecB) {
      const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
      const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
      const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
      return magA && magB ? dot / (magA * magB) : 0;
    }
  }
  
  module.exports = { LocalVectorStore };