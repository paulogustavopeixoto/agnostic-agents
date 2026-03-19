const { BaseProvider } = require('../llm/BaseProvider');
const { BaseRunStore } = require('./stores/BaseRunStore');
const { BaseJobStore } = require('./stores/BaseJobStore');
const { BaseLayerStore } = require('../agent/memory/BaseLayerStore');

class CertificationKit {
  certifyProvider(adapter, { name = null } = {}) {
    const errors = [];
    const warnings = [];
    const adapterName = name || adapter?.constructor?.name || 'adapter';

    if (!adapter || typeof adapter !== 'object') {
      errors.push('Provider adapter must be an object.');
    } else {
      for (const method of ['generateText', 'getCapabilities', 'supports']) {
        if (typeof adapter[method] !== 'function') {
          errors.push(`Provider adapter must implement ${method}().`);
        }
      }

      if (typeof adapter.getCapabilities === 'function') {
        const capabilities = adapter.getCapabilities();
        if (typeof capabilities !== 'object' || Array.isArray(capabilities)) {
          errors.push('Provider adapter getCapabilities() must return an object.');
        } else if (!('generateText' in capabilities)) {
          warnings.push('Provider capability map does not declare generateText explicitly.');
        }
      }
    }

    return {
      target: adapterName,
      kind: 'provider_adapter',
      level: errors.length === 0 ? 'contract_verified' : 'experimental',
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        runtimeContract: 'BaseProvider-compatible',
        exportedSurfaceOnly: !(adapter instanceof BaseProvider) ? 'assumed' : 'yes',
      },
    };
  }

  certifyStore(store, { type = 'run', name = null } = {}) {
    const errors = [];
    const target = name || `${type}-store`;

    try {
      if (type === 'run') {
        BaseRunStore.assert(store, target);
      } else if (type === 'job') {
        BaseJobStore.assert(store, target);
      } else if (type === 'layer') {
        BaseLayerStore.assert(store, target);
      } else {
        throw new Error(`Unknown store type "${type}".`);
      }
    } catch (error) {
      errors.push(error.message || String(error));
    }

    return {
      target,
      kind: `${type}_store`,
      level: errors.length === 0 ? 'contract_verified' : 'experimental',
      valid: errors.length === 0,
      errors,
      warnings: [],
      summary: {
        storeType: type,
      },
    };
  }
}

module.exports = { CertificationKit };
