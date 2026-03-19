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
    const candidate =
      candidateOrTaskFamily && typeof candidateOrTaskFamily === 'object' ? candidateOrTaskFamily : {};
    const taskFamily =
      typeof candidateOrTaskFamily === 'string'
        ? candidateOrTaskFamily
        : context.taskFamily ||
          candidate.taskFamily ||
          candidate.taskType ||
          candidate.metadata?.taskFamily ||
          null;
    const riskClass = context.riskClass || candidate.riskClass || candidate.metadata?.riskClass || null;
    const artifactType =
      context.artifactType || candidate.artifactType || candidate.metadata?.artifactType || null;

    if (!taskFamily) {
      return null;
    }

    const base = this.schemas.get(taskFamily) || null;
    if (!base) {
      return null;
    }

    const riskOverlay = riskClass ? base.riskClasses?.[riskClass] || null : null;
    const artifactOverlay = artifactType ? base.artifactTypes?.[artifactType] || null : null;

    return this._mergeSchema(base, riskOverlay, artifactOverlay, { riskClass, artifactType });
  }

  list() {
    return [...this.schemas.values()];
  }

  _normalizeSchema(taskFamily, schema = {}) {
    const taxonomy = this._normalizeTaxonomy(schema.taxonomy || {});

    const allowedFailureTypes = new Set([
      ...(Array.isArray(schema.allowedFailureTypes) ? schema.allowedFailureTypes : []),
      ...Object.keys(taxonomy),
    ]);

    return {
      taskFamily,
      defaultFailureType: schema.defaultFailureType || 'general',
      allowedFailureTypes: [...allowedFailureTypes],
      taxonomy,
      riskClasses: this._normalizeDimensionMap(schema.riskClasses || {}),
      artifactTypes: this._normalizeDimensionMap(schema.artifactTypes || {}),
      metadata: schema.metadata || {},
    };
  }

  _normalizeTaxonomy(taxonomyInput = {}) {
    const taxonomy = {};
    for (const [failureType, defaults] of Object.entries(taxonomyInput || {})) {
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
    return taxonomy;
  }

  _normalizeDimensionMap(input = {}) {
    const normalized = {};
    for (const [key, value] of Object.entries(input || {})) {
      normalized[key] = {
        taxonomy: this._normalizeOverlayTaxonomy(value?.taxonomy || {}),
        metadata: value?.metadata || {},
      };
    }
    return normalized;
  }

  _normalizeOverlayTaxonomy(taxonomyInput = {}) {
    const taxonomy = {};
    for (const [failureType, defaults] of Object.entries(taxonomyInput || {})) {
      taxonomy[failureType] = {
        ...(defaults && 'severity' in defaults ? { severity: defaults.severity } : {}),
        ...(defaults && 'verdict' in defaults ? { verdict: defaults.verdict } : {}),
        ...(defaults && 'recommendedAction' in defaults
          ? { recommendedAction: defaults.recommendedAction }
          : {}),
        ...(Array.isArray(defaults?.requiredEvidence)
          ? { requiredEvidence: [...defaults.requiredEvidence] }
          : {}),
        ...(defaults?.metadata ? { metadata: defaults.metadata } : {}),
      };
    }
    return taxonomy;
  }

  _mergeSchema(base, riskOverlay, artifactOverlay, dimensions = {}) {
    const mergedTaxonomy = JSON.parse(JSON.stringify(base.taxonomy || {}));

    for (const overlay of [riskOverlay, artifactOverlay]) {
      if (!overlay?.taxonomy) {
        continue;
      }

      for (const [failureType, defaults] of Object.entries(overlay.taxonomy)) {
        mergedTaxonomy[failureType] = {
          ...(mergedTaxonomy[failureType] || {}),
          ...defaults,
          requiredEvidence: [
            ...new Set([
              ...((mergedTaxonomy[failureType]?.requiredEvidence) || []),
              ...((defaults?.requiredEvidence) || []),
            ]),
          ],
          metadata: {
            ...((mergedTaxonomy[failureType]?.metadata) || {}),
            ...(defaults?.metadata || {}),
          },
        };
      }
    }

    return {
      taskFamily: base.taskFamily,
      defaultFailureType: base.defaultFailureType,
      allowedFailureTypes: [...base.allowedFailureTypes],
      taxonomy: mergedTaxonomy,
      metadata: {
        ...(base.metadata || {}),
        ...(riskOverlay?.metadata || {}),
        ...(artifactOverlay?.metadata || {}),
        riskClass: dimensions.riskClass || null,
        artifactType: dimensions.artifactType || null,
      },
    };
  }
}

module.exports = { CritiqueSchemaRegistry };
