const { ExtensionHost } = require('./ExtensionHost');
const { ExtensionManifest } = require('./ExtensionManifest');
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
}

module.exports = { ConformanceKit };
