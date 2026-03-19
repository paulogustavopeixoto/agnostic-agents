const {
  ArtifactCompatibilitySuite,
  EvalReportArtifact,
  ExtensionManifest,
  PolicyEvaluationRecord,
  PolicyPack,
  Run,
  StateBundle,
  ToolPolicy,
  TraceSerializer,
} = require('../index');

async function main() {
  const run = new Run({
    input: 'Validate artifact compatibility.',
    status: 'completed',
    metadata: {
      lineage: {
        rootRunId: 'interop-root',
        parentRunId: null,
        childRunIds: [],
        branchOriginRunId: null,
        branchCheckpointId: null,
      },
    },
  });
  run.addCheckpoint({
    id: `${run.id}:checkpoint:1`,
    label: 'run_completed',
    status: 'completed',
    snapshot: run.createCheckpointSnapshot(),
  });

  const trace = TraceSerializer.exportRun(run);
  const traceBundle = TraceSerializer.exportBundle([run]);
  const policyPack = PolicyPack.fromToolPolicy(
    new ToolPolicy({
      rules: [
        {
          id: 'require-approval-outbound',
          toolNames: ['send_status_update'],
          action: 'require_approval',
        },
      ],
    }),
    {
      name: 'interop-policy',
      version: '1.0.0',
    }
  ).toJSON();
  const policyEvaluation = new PolicyEvaluationRecord({
    subject: { type: 'run', runId: run.id },
    report: {
      summary: { total: 1, approvalsRequired: 1 },
      explanations: [{ ruleId: 'require-approval-outbound', explanation: 'approval required' }],
    },
  }).toJSON();
  const stateBundle = new StateBundle({
    run,
    memory: {
      working: {
        active_task: 'validate artifact compatibility',
      },
    },
  }).toJSON();
  const evalReport = EvalReportArtifact.fromReport(
    {
      total: 1,
      passed: 1,
      failed: 0,
      results: [{ id: 'interop-fixture', passed: true, durationMs: 1, error: null }],
    },
    {
      suite: 'interop-artifacts',
    }
  ).toJSON();
  const manifest = ExtensionManifest.fromExtension({
    name: 'interop-artifact-extension',
    version: '1.0.0',
    contributes: {
      evalScenarios: [{ id: 'interop-scenario', run: async () => 'ok', assert: output => output === 'ok' }],
    },
  }).toJSON();

  const suite = new ArtifactCompatibilitySuite();
  const report = suite.run({
    trace,
    traceBundle,
    policyPack,
    policyEvaluation,
    stateBundle,
    evalReport,
    manifest,
  });

  console.log('Interop artifact compatibility report:');
  console.dir(report, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
