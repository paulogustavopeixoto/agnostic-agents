const { Run } = require('./Run');

/**
 * Portable trace serializer for durable run export, replay preparation,
 * and external tooling integrations.
 */
class TraceSerializer {
  static get SCHEMA_VERSION() {
    return '1.1';
  }

  static get RUN_FORMAT() {
    return 'agnostic-agents-run-trace';
  }

  static get BUNDLE_FORMAT() {
    return 'agnostic-agents-trace-bundle';
  }

  /**
   * Describes the supported portable trace schema.
   *
   * @returns {object}
   */
  static describeSchema() {
    return {
      schemaVersion: TraceSerializer.SCHEMA_VERSION,
      runFormat: TraceSerializer.RUN_FORMAT,
      bundleFormat: TraceSerializer.BUNDLE_FORMAT,
      requiredRunFields: ['schemaVersion', 'format', 'exportedAt', 'metadata', 'run'],
      requiredBundleFields: ['schemaVersion', 'format', 'exportedAt', 'metadata', 'traces'],
    };
  }

  /**
   * Exports a full run trace using the maintained run-trace schema.
   *
   * @param {Run|object} run
   * @param {object} [metadata]
   * @returns {object}
   */
  static exportRun(run, metadata = {}) {
    const sourceRun = run instanceof Run ? run : Run.fromJSON(run);
    return {
      schemaVersion: TraceSerializer.SCHEMA_VERSION,
      format: TraceSerializer.RUN_FORMAT,
      traceType: 'run',
      exportedAt: new Date().toISOString(),
      metadata,
      run: sourceRun.toJSON(),
    };
  }

  /**
   * Imports a full run trace back into a Run instance.
   *
   * @param {object} trace
   * @returns {Run}
   */
  static importRun(trace = {}) {
    const validation = TraceSerializer.validateTrace(trace);
    if (!validation.valid) {
      throw new Error(`Invalid run trace format: ${validation.errors.join('; ')}`);
    }

    return Run.fromJSON(trace.run || {});
  }

  /**
   * Exports a checkpoint-derived partial trace for replay or recovery tooling.
   *
   * @param {Run|object} run
   * @param {object} [options]
   * @param {string|null} [options.checkpointId]
   * @param {object} [options.metadata]
   * @returns {object}
   */
  static exportPartialRun(run, { checkpointId = null, metadata = {} } = {}) {
    const sourceRun = run instanceof Run ? run : Run.fromJSON(run);
    const checkpoint = sourceRun.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(
        checkpointId
          ? `Checkpoint "${checkpointId}" not found on run "${sourceRun.id}".`
          : `Run "${sourceRun.id}" has no checkpoints to export from.`
      );
    }

    const partialRun = sourceRun.branchFromCheckpoint(checkpoint.id, {
      id: `${sourceRun.id}:partial:${Date.now()}`,
      metadata: {
        replaySourceRunId: sourceRun.id,
        replayCheckpointId: checkpoint.id,
      },
    });

    return {
      schemaVersion: TraceSerializer.SCHEMA_VERSION,
      format: TraceSerializer.RUN_FORMAT,
      traceType: 'partial',
      exportedAt: new Date().toISOString(),
      metadata: {
        ...metadata,
        mode: 'partial',
        sourceRunId: sourceRun.id,
        checkpointId: checkpoint.id,
      },
      run: partialRun.toJSON(),
    };
  }

  /**
   * Exports multiple runs as a portable bundle for external tooling.
   *
   * @param {Array<Run|object>} runs
   * @param {object} [metadata]
   * @returns {object}
   */
  static exportBundle(runs = [], metadata = {}) {
    const traces = runs.map(run => TraceSerializer.exportRun(run));
    return {
      schemaVersion: TraceSerializer.SCHEMA_VERSION,
      format: TraceSerializer.BUNDLE_FORMAT,
      traceType: 'bundle',
      exportedAt: new Date().toISOString(),
      metadata,
      index: traces.map(trace => ({
        runId: trace.run?.id || null,
        status: trace.run?.status || null,
      })),
      traces,
    };
  }

  /**
   * Imports a portable bundle into Run instances.
   *
   * @param {object} bundle
   * @returns {Run[]}
   */
  static importBundle(bundle = {}) {
    const validation = TraceSerializer.validateTrace(bundle, { allowBundle: true });
    if (!validation.valid || bundle.format !== TraceSerializer.BUNDLE_FORMAT) {
      throw new Error(`Invalid trace bundle format: ${validation.errors.join('; ')}`);
    }

    return (bundle.traces || []).map(trace => TraceSerializer.importRun(trace));
  }

  /**
   * Validates a trace or trace bundle against the maintained schema.
   *
   * @param {object} [trace]
   * @param {object} [options]
   * @param {boolean} [options.allowBundle]
   * @returns {{valid:boolean, errors:string[], warnings:string[]}}
   */
  static validateTrace(trace = {}, { allowBundle = false } = {}) {
    const errors = [];
    const warnings = [];

    if (!trace || typeof trace !== 'object') {
      errors.push('Trace payload must be an object.');
      return { valid: false, errors, warnings };
    }

    if (typeof trace.schemaVersion !== 'string' || !trace.schemaVersion.trim()) {
      errors.push('schemaVersion is required.');
    }

    if (trace.schemaVersion && trace.schemaVersion !== TraceSerializer.SCHEMA_VERSION) {
      warnings.push(
        `Trace schemaVersion "${trace.schemaVersion}" differs from supported version "${TraceSerializer.SCHEMA_VERSION}".`
      );
    }

    if (trace.format === TraceSerializer.RUN_FORMAT) {
      if (!trace.exportedAt) {
        errors.push('exportedAt is required.');
      }
      if (!('metadata' in trace)) {
        errors.push('metadata is required.');
      }
      if (!trace.run || typeof trace.run !== 'object') {
        errors.push('run is required.');
      } else {
        if (!trace.run.id) {
          errors.push('run.id is required.');
        }
        if (!trace.run.status) {
          errors.push('run.status is required.');
        }
      }
    } else if (trace.format === TraceSerializer.BUNDLE_FORMAT) {
      if (!allowBundle) {
        errors.push('Bundle format is not allowed in this context.');
      }
      if (!Array.isArray(trace.traces)) {
        errors.push('traces must be an array.');
      } else {
        trace.traces.forEach((childTrace, index) => {
          const childValidation = TraceSerializer.validateTrace(childTrace);
          if (!childValidation.valid) {
            errors.push(`traces[${index}] is invalid: ${childValidation.errors.join(', ')}`);
          }
          warnings.push(...childValidation.warnings);
        });
      }
    } else {
      errors.push('Unsupported trace format.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

module.exports = { TraceSerializer };
