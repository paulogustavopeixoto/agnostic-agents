const { Run } = require('./Run');
const { DistributedRunEnvelope } = require('./DistributedRunEnvelope');

class TraceCorrelation {
  static fromRun(run, metadata = {}) {
    const normalizedRun = run instanceof Run ? run : Run.fromJSON(run || {});
    const lineage = normalizedRun.metadata?.lineage || {};

    return {
      traceId: lineage.rootRunId || normalizedRun.id,
      spanId: normalizedRun.id,
      parentSpanId: lineage.parentRunId || lineage.branchOriginRunId || null,
      checkpointId: lineage.branchCheckpointId || null,
      status: normalizedRun.status,
      ...metadata,
    };
  }

  static fromEnvelope(envelope, metadata = {}) {
    const parsed = DistributedRunEnvelope.parse(envelope);
    return {
      traceId: parsed.lineage?.rootRunId || parsed.runId,
      spanId: parsed.runId,
      parentSpanId: parsed.lineage?.parentRunId || parsed.lineage?.branchOriginRunId || null,
      checkpointId: parsed.checkpointId || parsed.lineage?.branchCheckpointId || null,
      runtimeKind: parsed.runtimeKind,
      action: parsed.action,
      ...metadata,
    };
  }

  static annotateMetadata(metadata = {}, correlation = {}) {
    return {
      ...metadata,
      correlation: {
        ...(metadata.correlation || {}),
        ...correlation,
      },
    };
  }
}

module.exports = { TraceCorrelation };
