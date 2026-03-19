const { ExtensionHost } = require('./ExtensionHost');
const { ExtensionManifest } = require('./ExtensionManifest');
const { TraceSerializer } = require('./TraceSerializer');
const { PolicyPack } = require('./PolicyPack');
const { PolicyEvaluationRecord } = require('./PolicyEvaluationRecord');
const { StateBundleSerializer } = require('./StateBundleSerializer');
const { EvalReportArtifact } = require('./EvalReportArtifact');
const { BaseRunStore } = require('./stores/BaseRunStore');
const { BaseJobStore } = require('./stores/BaseJobStore');
const { BaseLayerStore } = require('../agent/memory/BaseLayerStore');

class ConformanceKit {
  validateManifest(manifest) {
    const payload = manifest?.toJSON ? manifest.toJSON() : manifest || {};
    return ExtensionManifest.validate(payload);
  }

  validateExtension(extension, { manifest = null } = {}) {
    const errors = [];
    let normalized = null;

    try {
      const host = new ExtensionHost();
      normalized = host.register(extension);
    } catch (error) {
      errors.push(error.message || String(error));
    }

    const resolvedManifest = manifest
      ? manifest instanceof ExtensionManifest
        ? manifest
        : ExtensionManifest.fromJSON(manifest)
      : ExtensionManifest.fromExtension(extension || {});
    const manifestValidation = this.validateManifest(resolvedManifest);
    errors.push(...manifestValidation.errors);

    return {
      valid: errors.length === 0,
      errors,
      summary: {
        manifestName: resolvedManifest.name,
        manifestKind: resolvedManifest.kind,
        contributionTypes: resolvedManifest.capabilities,
        registered: Boolean(normalized),
      },
    };
  }

  validateStore(store, { type = 'run' } = {}) {
    const errors = [];

    try {
      if (type === 'run') {
        BaseRunStore.assert(store, 'ConformanceKit run store');
      } else if (type === 'job') {
        BaseJobStore.assert(store, 'ConformanceKit job store');
      } else if (type === 'layer') {
        BaseLayerStore.assert(store, 'ConformanceKit layer store');
      } else {
        throw new Error(`Unknown store type "${type}".`);
      }
    } catch (error) {
      errors.push(error.message || String(error));
    }

    return {
      valid: errors.length === 0,
      errors,
      summary: {
        type,
      },
    };
  }

  validateArtifact(artifact, { type = 'manifest' } = {}) {
    if (type === 'manifest') {
      return this.validateManifest(artifact);
    }

    if (type === 'trace') {
      const validation = TraceSerializer.validateTrace(artifact);
      return {
        valid: validation.valid,
        errors: validation.errors,
      };
    }

    if (type === 'traceBundle') {
      const validation = TraceSerializer.validateTrace(artifact, { allowBundle: true });
      return {
        valid: validation.valid,
        errors: validation.errors,
      };
    }

    if (type === 'policyPack') {
      return this._validateShapedArtifact(artifact, {
        format: PolicyPack.FORMAT,
        schemaVersion: PolicyPack.SCHEMA_VERSION,
      });
    }

    if (type === 'policyEvaluation') {
      return this._validateShapedArtifact(artifact, {
        format: PolicyEvaluationRecord.FORMAT,
        schemaVersion: PolicyEvaluationRecord.SCHEMA_VERSION,
      });
    }

    if (type === 'stateBundle') {
      return StateBundleSerializer.validate(artifact);
    }

    if (type === 'evalReport') {
      return this._validateShapedArtifact(artifact, {
        format: EvalReportArtifact.FORMAT,
        schemaVersion: EvalReportArtifact.SCHEMA_VERSION,
      });
    }

    if (!artifact || typeof artifact !== 'object') {
      return {
        valid: false,
        errors: [`${type} artifact must be an object.`],
      };
    }

    if (!artifact.format || !artifact.schemaVersion) {
      return {
        valid: false,
        errors: [`${type} artifact must include format and schemaVersion.`],
      };
    }

    return {
      valid: true,
      errors: [],
    };
  }

  _validateShapedArtifact(artifact, { format, schemaVersion }) {
    if (!artifact || typeof artifact !== 'object') {
      return {
        valid: false,
        errors: ['Artifact must be an object.'],
      };
    }

    const errors = [];

    if (artifact.format !== format) {
      errors.push(`Artifact format must be "${format}".`);
    }

    if (artifact.schemaVersion !== schemaVersion) {
      errors.push(`Artifact schemaVersion must be "${schemaVersion}".`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

module.exports = { ConformanceKit };
