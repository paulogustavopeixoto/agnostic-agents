const { Run } = require('./Run');

class DistributedRunEnvelope {
  static get SCHEMA_VERSION() {
    return '1.0';
  }

  static get FORMAT() {
    return 'agnostic-agents-distributed-run-envelope';
  }

  static create(run, { runtimeKind = 'agent', action = 'resume', checkpointId = null, metadata = {} } = {}) {
    const sourceRun = run instanceof Run ? run : Run.fromJSON(run || {});

    return {
      schemaVersion: DistributedRunEnvelope.SCHEMA_VERSION,
      format: DistributedRunEnvelope.FORMAT,
      exportedAt: new Date().toISOString(),
      runtimeKind,
      action,
      runId: sourceRun.id,
      checkpointId,
      status: sourceRun.status,
      lineage: { ...(sourceRun.metadata?.lineage || {}) },
      metadata: {
        ...metadata,
        sourceRunId: sourceRun.id,
      },
    };
  }

  static validate(envelope = {}) {
    const errors = [];

    if (!envelope || typeof envelope !== 'object') {
      errors.push('Envelope payload must be an object.');
      return { valid: false, errors };
    }

    if (envelope.schemaVersion !== DistributedRunEnvelope.SCHEMA_VERSION) {
      errors.push(
        `Unsupported schemaVersion "${envelope.schemaVersion || ''}".`
      );
    }

    if (envelope.format !== DistributedRunEnvelope.FORMAT) {
      errors.push('Unsupported distributed run envelope format.');
    }

    if (!envelope.runtimeKind) {
      errors.push('runtimeKind is required.');
    }

    if (!envelope.action) {
      errors.push('action is required.');
    }

    if (!envelope.runId) {
      errors.push('runId is required.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static parse(envelope = {}) {
    const validation = DistributedRunEnvelope.validate(envelope);
    if (!validation.valid) {
      throw new Error(`Invalid distributed run envelope: ${validation.errors.join('; ')}`);
    }

    return envelope;
  }
}

module.exports = { DistributedRunEnvelope };
