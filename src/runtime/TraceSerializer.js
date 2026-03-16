const { Run } = require('./Run');

class TraceSerializer {
  static exportRun(run, metadata = {}) {
    const sourceRun = run instanceof Run ? run : Run.fromJSON(run);
    return {
      schemaVersion: '1.0',
      format: 'agnostic-agents-run-trace',
      exportedAt: new Date().toISOString(),
      metadata,
      run: sourceRun.toJSON(),
    };
  }

  static importRun(trace = {}) {
    if (!trace || trace.format !== 'agnostic-agents-run-trace') {
      throw new Error('Invalid run trace format.');
    }

    return Run.fromJSON(trace.run || {});
  }

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
      schemaVersion: '1.0',
      format: 'agnostic-agents-run-trace',
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
}

module.exports = { TraceSerializer };
