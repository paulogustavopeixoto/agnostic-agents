/**
 * Stores task-family critique schemas so coordination logic can apply
 * structured failure taxonomies without hardcoding them into every reviewer.
 */
class CritiqueSchemaRegistry {
  /**
   * @param {object} [options]
   * @param {Array<object>|Record<string, object>} [options.schemas]
   */
  constructor({ schemas = [] } = {}) {
    this.schemas = new Map();

    if (Array.isArray(schemas)) {
      for (const schema of schemas) {
        this.register(schema?.taskFamily, schema);
      }
      return;
    }

    for (const [taskFamily, schema] of Object.entries(schemas || {})) {
      this.register(taskFamily, schema);
    }
  }

  register(taskFamily, schema = {}) {
    if (!taskFamily) {
      throw new Error('Critique schemas require a taskFamily.');
    }

    const normalized = this._normalizeSchema(taskFamily, schema);
    this.schemas.set(taskFamily, normalized);
    return normalized;
  }

  resolve(candidateOrTaskFamily = null, context = {}) {
    const taskFamily =
      typeof candidateOrTaskFamily === 'string'
        ? candidateOrTaskFamily
        : context.taskFamily ||
          candidateOrTaskFamily?.taskFamily ||
          candidateOrTaskFamily?.taskType ||
          candidateOrTaskFamily?.metadata?.taskFamily ||
          null;

    return taskFamily ? this.schemas.get(taskFamily) || null : null;
  }

  list() {
    return [...this.schemas.values()];
  }

  _normalizeSchema(taskFamily, schema = {}) {
    const taxonomy = {};
    for (const [failureType, defaults] of Object.entries(schema.taxonomy || {})) {
      taxonomy[failureType] = {
        severity: defaults?.severity || 'medium',
        verdict: defaults?.verdict || 'revise',
        recommendedAction: defaults?.recommendedAction || 'revise',
        requiredEvidence: Array.isArray(defaults?.requiredEvidence)
          ? [...defaults.requiredEvidence]
          : [],
        metadata: defaults?.metadata || {},
      };
    }

    const allowedFailureTypes = new Set([
      ...(Array.isArray(schema.allowedFailureTypes) ? schema.allowedFailureTypes : []),
      ...Object.keys(taxonomy),
    ]);

    return {
      taskFamily,
      defaultFailureType: schema.defaultFailureType || 'general',
      allowedFailureTypes: [...allowedFailureTypes],
      taxonomy,
      metadata: schema.metadata || {},
    };
  }
}

module.exports = { CritiqueSchemaRegistry };
