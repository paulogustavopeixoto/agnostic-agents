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
}

module.exports = { TraceSerializer };
