const {
  PolicyPack,
  PolicyEvaluationRecord,
  PolicySimulator,
  ProductionPolicyPack,
  Run,
  EvalHarness,
  TraceSerializer,
} = require('../index');

async function main() {
  const productionPack = new ProductionPolicyPack({
    environment: 'staging',
    protectedToolNames: ['send_status_update'],
    denySideEffectLevels: ['destructive'],
  });

  const policyPack = productionPack.toPolicyPack();
  const simulator = new PolicySimulator({ policyPack });

  const run = new Run({
    input: 'Send the update.',
    toolCalls: [
      {
        name: 'send_status_update',
        arguments: {
          recipient: 'Paulo',
          summary: 'Policy simulation is ready.',
        },
        metadata: {
          sideEffectLevel: 'external_write',
        },
      },
      {
        name: 'delete_records',
        arguments: {
          scope: 'all',
        },
        metadata: {
          sideEffectLevel: 'destructive',
        },
      },
    ],
    status: 'completed',
  });

  const exportedPack = policyPack.toJSON();
  const importedPack = PolicyPack.fromJSON(exportedPack);
  const nextPack = new PolicyPack({
    id: importedPack.id,
    name: importedPack.name,
    version: '1.1.0',
    description: importedPack.description,
    defaultAction: importedPack.defaultAction,
    rules: [
      ...importedPack.rules,
      {
        id: 'staging-deny-bulk-export',
        toolNames: ['bulk_export'],
        action: 'deny',
        reason: 'Bulk export is blocked in staging.',
      },
    ],
    allowTools: importedPack.allowTools,
    denyTools: importedPack.denyTools,
    metadata: importedPack.metadata,
  });
  const runReportInstance = simulator.simulateRun(run);
  const runReport = runReportInstance.toJSON();
  const evaluationRecord = simulator.createEvaluationRecord(
    {
      type: 'run',
      runId: run.id,
    },
    runReport
  );
  const bundleReport = simulator.simulateTraceBundle(
    TraceSerializer.exportBundle([run], { exportedFor: 'policy-simulation-demo' })
  );
  const harness = new EvalHarness({
    scenarios: [
      {
        id: 'policy-simulation-run-scenario',
        run: async () => simulator.simulateRun(run),
        assert: report =>
          report.summarize().approvalsRequired === 1 &&
          report.summarize().denied === 1,
      },
    ],
  });
  const evalReport = await harness.run();

  console.log('Policy pack artifact:');
  console.dir(
    {
      format: exportedPack.format,
      schemaVersion: exportedPack.schemaVersion,
      name: importedPack.name,
      version: importedPack.version,
      rules: importedPack.rules.map(rule => rule.id),
    },
    { depth: null }
  );

  console.log('\nPolicy diff summary:');
  console.dir(
    {
      versions: [importedPack.version, nextPack.version],
      addedRules: importedPack.diff(nextPack).addedRules.map(rule => rule.id),
      removedRules: importedPack.diff(nextPack).removedRules.map(rule => rule.id),
      denyToolsChanged: importedPack.diff(nextPack).denyToolsChanged,
    },
    { depth: null }
  );

  console.log('\nPolicy simulation report:');
  console.dir(runReport, { depth: null });

  console.log('\nPolicy explanation summary:');
  console.dir(runReportInstance.explain(), { depth: null });

  console.log('\nPolicy evaluation artifact:');
  console.dir(
    PolicyEvaluationRecord.fromJSON(evaluationRecord.toJSON()).summarize(),
    { depth: null }
  );

  console.log('\nTrace-bundle simulation summary:');
  console.dir(bundleReport.summary, { depth: null });

  console.log('\nPolicy eval harness report:');
  console.dir(evalReport, { depth: null });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
