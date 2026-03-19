const { TraceSerializer } = require('./TraceSerializer');
const { PolicyPack } = require('./PolicyPack');
const { PolicyEvaluationRecord } = require('./PolicyEvaluationRecord');
const { EvalReportArtifact } = require('./EvalReportArtifact');
const { ExtensionManifest } = require('./ExtensionManifest');
const { StateBundleSerializer } = require('./StateBundleSerializer');
const { ToolSchemaArtifact } = require('./ToolSchemaArtifact');

class InteropArtifactRegistry {
  export(type, value, metadata = {}) {
    switch (type) {
      case 'tool':
        return new ToolSchemaArtifact({
          tool: value,
          metadata,
        }).toJSON();
      case 'trace':
        return TraceSerializer.exportRun(value, metadata);
      case 'traceBundle':
        return TraceSerializer.exportBundle(value, metadata);
      case 'policyPack':
        return (value instanceof PolicyPack ? value : PolicyPack.fromJSON(value || {})).toJSON();
      case 'policyEvaluation':
        return (
          value instanceof PolicyEvaluationRecord ? value : PolicyEvaluationRecord.fromJSON(value || {})
        ).toJSON();
      case 'evalReport':
        return EvalReportArtifact.fromReport(value || {}, metadata).toJSON();
      case 'stateBundle':
        return StateBundleSerializer.export(value || {});
      case 'manifest':
        return (value instanceof ExtensionManifest ? value : ExtensionManifest.fromJSON(value || {})).toJSON();
      default:
        throw new Error(`Unsupported interop artifact type "${type}".`);
    }
  }

  import(type, payload = {}) {
    switch (type) {
      case 'tool':
        return ToolSchemaArtifact.fromJSON(payload);
      case 'trace':
        return TraceSerializer.importRun(payload);
      case 'traceBundle':
        return TraceSerializer.importBundle(payload);
      case 'policyPack':
        return PolicyPack.fromJSON(payload);
      case 'policyEvaluation':
        return PolicyEvaluationRecord.fromJSON(payload);
      case 'evalReport':
        return EvalReportArtifact.fromJSON(payload);
      case 'stateBundle':
        return StateBundleSerializer.import(payload);
      case 'manifest':
        return ExtensionManifest.fromJSON(payload);
      default:
        throw new Error(`Unsupported interop artifact type "${type}".`);
    }
  }
}

module.exports = { InteropArtifactRegistry };
