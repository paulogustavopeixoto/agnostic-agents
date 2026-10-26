const { BaseRetriever } = require('./BaseRetriever');
const { ToolPolicyError } = require('../../errors');

/** Bind scope from authenticated host context, never from model arguments. */
class ScopedRetriever extends BaseRetriever {
  constructor({ retriever, tenantId, authorizeQuery, authorizeMatch = null } = {}) {
    super();
    if (!retriever?.search || typeof tenantId !== 'string' || !tenantId.trim() ||
        typeof authorizeQuery !== 'function' || (authorizeMatch !== null && typeof authorizeMatch !== 'function')) throw new TypeError('Invalid scoped retriever.');
    this.retriever = retriever;
    this.tenantId = tenantId;
    this.authorizeQuery = authorizeQuery;
    this.authorizeMatch = authorizeMatch;
  }

  async search(query, options = {}) {
    const tenantId = this.tenantId;
    if (await this.authorizeQuery({ query, tenantId }) !== true) throw new ToolPolicyError('Retrieval denied.');
    const result = await this.retriever.search(query, {
      ...options, namespace: tenantId,
      filter: { $and: [options.filter || {}, { tenantId: { $eq: tenantId } }] },
    });
    if (!Array.isArray(result?.matches) || result.matches.some(match => match.metadata?.tenantId !== tenantId)) {
      throw new ToolPolicyError('Retrieval scope violation.');
    }
    if (this.authorizeMatch) for (const match of result.matches) {
      if (await this.authorizeMatch(match, { tenantId, query }) !== true) {
        throw new ToolPolicyError('Retrieved document access denied.');
      }
    }
    // Return only documented result fields. Upstream debug fields may contain other documents.
    return { query, namespace: tenantId, matches: result.matches.map(match => ({
      id: match.id, text: match.text, score: match.score, metadata: { ...match.metadata },
    })) };
  }
}

module.exports = { ScopedRetriever };
