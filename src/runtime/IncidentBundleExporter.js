const { TraceSerializer } = require('./TraceSerializer');
const { StateBundleSerializer } = require('./StateBundleSerializer');

class IncidentBundleExporter {
  export({
    run = null,
    traceBundle = null,
    stateBundle = null,
    policyEvaluation = null,
    coordinationDiagnostics = null,
    assuranceReport = null,
    metadata = {},
  } = {}) {
    return {
      kind: 'agnostic-agents/incident-bundle',
      version: '1.0.0',
      metadata,
      traceBundle: traceBundle || (run ? TraceSerializer.exportBundle({ runs: [run] }) : null),
      stateBundle: stateBundle ? StateBundleSerializer.export(stateBundle) : null,
      policyEvaluation,
      coordinationDiagnostics,
      assuranceReport,
    };
  }
}

module.exports = { IncidentBundleExporter };
