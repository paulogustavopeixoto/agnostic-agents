class EvidenceGraph {
  constructor({ nodes = [], edges = [] } = {}) {
    this.nodes = [...nodes];
    this.edges = [...edges];
  }

  addNode(node) {
    if (!node?.id) {
      throw new Error('EvidenceGraph nodes require an id.');
    }

    if (!this.nodes.find(entry => entry.id === node.id)) {
      this.nodes.push({ ...node });
    }

    return node;
  }

  addEdge(edge) {
    if (!edge?.from || !edge?.to || !edge?.type) {
      throw new Error('EvidenceGraph edges require from, to, and type.');
    }

    this.edges.push({ ...edge });
    return edge;
  }

  detectConflicts() {
    const conflicts = [];
    const textNodes = this.nodes.filter(node => typeof node.label === 'string' && node.label.trim());

    const normalize = value =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\b(no|not|never|cannot|can't|wont|won't)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const isNegative = value => /\b(no|not|never|cannot|can't|wont|won't)\b/i.test(value);
    const extractSubject = value => {
      const match = value.toLowerCase().match(/^(.+?)\s+is\s+/);
      return match ? match[1].replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim() : '';
    };
    const extractPredicateTokens = value =>
      value
        .toLowerCase()
        .split(/\s+/)
        .filter(token => token && !['the', 'a', 'an', 'is', 'for', 'to', 'of', 'and', 'until'].includes(token))
        .map(token => token.replace(/[^a-z0-9]/g, ''))
        .filter(Boolean);

    for (let index = 0; index < textNodes.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < textNodes.length; compareIndex += 1) {
        const left = textNodes[index];
        const right = textNodes[compareIndex];
        if (normalize(left.label) && normalize(left.label) === normalize(right.label)) {
          if (isNegative(left.label) !== isNegative(right.label)) {
            conflicts.push({
              left: left.id,
              right: right.id,
              type: 'negation_conflict',
            });
          }
        }

        const leftSubject = extractSubject(left.label);
        const rightSubject = extractSubject(right.label);
        if (leftSubject && leftSubject === rightSubject && isNegative(left.label) !== isNegative(right.label)) {
          const leftTokens = extractPredicateTokens(left.label);
          const rightTokens = extractPredicateTokens(right.label);
          const overlap = leftTokens.filter(token => rightTokens.includes(token));
          if (overlap.length > 0) {
            conflicts.push({
              left: left.id,
              right: right.id,
              type: 'subject_predicate_conflict',
            });
          }
        }
      }
    }

    return conflicts;
  }

  summarize() {
    const conflicts = this.detectConflicts();
    return {
      nodes: this.nodes.length,
      edges: this.edges.length,
      nodeTypes: [...new Set(this.nodes.map(node => node.type).filter(Boolean))],
      conflicts: conflicts.length,
    };
  }
}

module.exports = { EvidenceGraph };
