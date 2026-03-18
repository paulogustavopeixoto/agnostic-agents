const { Run } = require('./Run');
const { StateBundle } = require('./StateBundle');

class StateBundleSerializer {
  static export({ run = null, memory = null, metadata = {} } = {}) {
    return new StateBundle({
      run: run instanceof Run ? run : run ? Run.fromJSON(run) : null,
      memory,
      metadata,
    }).toJSON();
  }

  static import(payload = {}) {
    return StateBundle.fromJSON(payload);
  }

  static validate(payload = {}) {
    const errors = [];

    if (!payload || typeof payload !== 'object') {
      errors.push('State bundle payload must be an object.');
      return { valid: false, errors };
    }

    if (payload.format !== StateBundle.FORMAT) {
      errors.push('Unsupported state bundle format.');
    }

    if (payload.schemaVersion !== StateBundle.SCHEMA_VERSION) {
      errors.push(`Unsupported state bundle schemaVersion "${payload.schemaVersion}".`);
    }

    if (!('run' in payload)) {
      errors.push('run is required.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

module.exports = { StateBundleSerializer };
