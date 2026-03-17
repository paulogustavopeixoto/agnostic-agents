const { execFile } = require('child_process');
const path = require('path');
const util = require('util');

const execFileAsync = util.promisify(execFile);

describe('Maintained examples', () => {
  test('local tool example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'localToolExample.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Final answer');
    expect(stdout).toContain('84');
  });

  test('local RAG example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'localRagExample.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Grounded answer');
    expect(stdout).toContain('Retrieved context');
  });

  test('local RAG + tool example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'localRagToolExample.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Grounded answer using retrieved context and tool result');
    expect(stdout).toContain('forecast');
    expect(stdout).toContain('Retrieved context');
  });

  test('reference queue worker example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceQueueWorker.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Queued envelope');
    expect(stdout).toContain('Remote worker result');
    expect(stdout).toContain("stage: 'replay'");
  });

  test('reference distributed incident example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceDistributedIncident.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Distributed incident report');
    expect(stdout).toContain('Correlation metadata');
    expect(stdout).toContain('destinationWorker');
  });

  test('reference remote control plane example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceRemoteControlPlane.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Governance requests');
    expect(stdout).toContain('Event sink requests');
    expect(stdout).toContain('waiting_for_approval');
    expect(stdout).toContain('completed');
  });

  test('reference public control plane example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referencePublicControlPlane.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Public control-plane snapshot');
    expect(stdout).toContain('renderedTree');
    expect(stdout).toContain('incidentSummary');
    expect(stdout).toContain('traceDiffSummary');
    expect(stdout).toContain('agnostic-agents-trace-bundle');
  });

  test('reference deployment split example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceDeploymentSplit.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('API run status');
    expect(stdout).toContain('Control-plane governance events');
    expect(stdout).toContain('Worker run summary');
    expect(stdout).toContain('waiting_for_approval');
    expect(stdout).toContain('completed');
  });

  test('reference distributed recovery example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceDistributedRecovery.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Distributed recovery plan');
    expect(stdout).toContain('Executed recovery action');
    expect(stdout).toContain('recommendedAction');
    expect(stdout).toContain('branch_from_failure_checkpoint');
  });

  test('reference adaptive benchmarks example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceAdaptiveBenchmarks.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Adaptive benchmark report');
    expect(stdout).toContain('adaptive-routing-benchmark');
    expect(stdout).toContain('adaptive-policy-suggestion-benchmark');
    expect(stdout).toContain('adaptive-governance-benchmark');
  });

  test('reference v7 audit example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceV7Audit.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('v7 Audit');
    expect(stdout).toContain('Learning summary');
    expect(stdout).toContain('Branch quality analysis');
    expect(stdout).toContain('Adaptive governance review');
    expect(stdout).toContain('Adaptive benchmark report');
  });

  test('reference coordination review example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceCoordinationReview.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Structured critique review');
    expect(stdout).toContain('Trust summary');
    expect(stdout).toContain('Resolved coordination action');
    expect(stdout).toContain('Coordination loop record');
  });

  test('reference decomposition advisor example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceDecompositionAdvisor.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Decomposition recommendation');
    expect(stdout).toContain('split_and_delegate');
    expect(stdout).toContain('researcher');
    expect(stdout).toContain('writer');
  });

  test('reference coordination benchmarks example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceCoordinationBenchmarks.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Coordination benchmark report');
    expect(stdout).toContain('coordination-critique-benchmark');
    expect(stdout).toContain('coordination-resolution-benchmark');
    expect(stdout).toContain('coordination-loop-benchmark');
    expect(stdout).toContain('coordination-decomposition-benchmark');
  });

  test('reference coordination policy gate example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceCoordinationPolicyGate.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Coordination policy gate summary');
    expect(stdout).toContain("policyAction: 'deny'");
    expect(stdout).toContain("gatedAction: 'escalate'");
    expect(stdout).toContain('Coordination policy evaluation artifact');
  });

  test('reference production policy pack example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceProductionPolicyPack.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Production policy decisions');
    expect(stdout).toContain('production-deny-tools');
    expect(stdout).toContain('production-protected-tools');
    expect(stdout).toContain('Governance events captured by pack');
  });

  test('reference policy simulation example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referencePolicySimulation.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Policy pack artifact');
    expect(stdout).toContain('Policy diff summary');
    expect(stdout).toContain('agnostic-agents-policy-pack');
    expect(stdout).toContain('Policy simulation report');
    expect(stdout).toContain('Policy explanation summary');
    expect(stdout).toContain('Policy evaluation artifact');
    expect(stdout).toContain('Trace-bundle simulation summary');
    expect(stdout).toContain('Policy eval harness report');
  });

  test('reference policy inheritance example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referencePolicyInheritance.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Resolved policy inheritance summary');
    expect(stdout).toContain('handoff:handoff-deny-send-status');
    expect(stdout).toContain('Scoped policy decision');
    expect(stdout).toContain("action: 'deny'");
  });

  test('reference policy lifecycle example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referencePolicyLifecycle.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Policy lifecycle summary');
    expect(stdout).toContain("activeVersion: '1.1.0'");
    expect(stdout).toContain("rolledBackFrom: '1.1.0'");
    expect(stdout).toContain('Policy rollback result');
  });

  test('reference approval and escalation policy suite example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceApprovalEscalationPolicySuite.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Approval and escalation policy suite report');
    expect(stdout).toContain('approval-protected-tool');
    expect(stdout).toContain('escalate-policy-branch-retry');
    expect(stdout).toContain('passed: true');
  });

  test('reference file-backed stack example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceFileBackedStack.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('File-backed stack summary');
    expect(stdout).toContain('local-file-backed');
    expect(stdout).toContain('storedRuns');
    expect(stdout).toContain('storedJobs');
    expect(stdout).toContain("runStatus: 'completed'");
    expect(stdout).toContain('runSummary');
  });

  test('reference worker coordination benchmarks example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceWorkerCoordinationBenchmarks.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Worker coordination benchmark report');
    expect(stdout).toContain('worker-coordination-lineage-benchmark');
    expect(stdout).toContain('worker-coordination-contract-benchmark');
  });

  test('reference runtime extension example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceRuntimeExtension.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Runtime extension summary');
    expect(stdout).toContain('reference-runtime-extension');
    expect(stdout).toContain('reference-require-approval');
    expect(stdout).toContain('reference-extension-scenario');
  });
});
