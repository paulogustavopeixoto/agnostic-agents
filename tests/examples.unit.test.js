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

  test('reference capability router example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceCapabilityRouter.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Capability route for coding task');
    expect(stdout).toContain("id: 'code-model'");
    expect(stdout).toContain('Capability route for risky action');
    expect(stdout).toContain("id: 'sandbox-worker'");
  });

  test('reference curl import example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceCurlImport.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Parsed curl request');
    expect(stdout).toContain('Generated API spec');
    expect(stdout).toContain('Imported tools');
    expect(stdout).toContain('importedImportedCurl');
  });

  test('reference utility toolkit example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceUtilityToolkit.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Postman API spec');
    expect(stdout).toContain('Resolved secret config');
    expect(stdout).toContain('Recorded tool result');
    expect(stdout).toContain('Prompt registry');
    expect(stdout).toContain('Route policy simulation');
    expect(stdout).toContain('Incident bundle');
  });

  test('reference memory governance example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceMemoryGovernance.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Memory governance summary');
    expect(stdout).toContain('publicPolicyRead');
    expect(stdout).toContain('governance');
    expect(stdout).toContain('conflict_detected');
  });

  test('reference memory governance review example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceMemoryGovernanceReview.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Memory governance review');
    expect(stdout).toContain('auditSummary');
    expect(stdout).toContain('benchmarkReport');
    expect(stdout).toContain('memory_access_blocked');
    expect(stdout).toContain('checklist');
  });

  test('reference budgeted autonomy example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceBudgetedAutonomy.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Budgeted autonomy summary');
    expect(stdout).toContain('firstDecision');
    expect(stdout).toContain('secondDecision');
    expect(stdout).toContain('approvalDelegationApplies');
    expect(stdout).toContain('budgetLedger');
  });

  test('reference autonomy policies example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceAutonomyPolicies.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Autonomy policy summary');
    expect(stdout).toContain('autonomyDecision');
    expect(stdout).toContain('blockedDecision');
    expect(stdout).toContain('interventionPlan');
    expect(stdout).toContain('approvalCache');
  });

  test('reference progressive autonomy example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceProgressiveAutonomy.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Progressive autonomy summary');
    expect(stdout).toContain('pausedRunStatus');
    expect(stdout).toContain('pendingPause');
    expect(stdout).toContain('widened');
    expect(stdout).toContain('tightened');
  });

  test('reference autonomy operations example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceAutonomyOperations.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Autonomy operations summary');
    expect(stdout).toContain('benchmarkReport');
    expect(stdout).toContain('fleetSummary');
    expect(stdout).toContain('adjustment');
    expect(stdout).toContain('rolloutGuard');
  });

  test('reference unified execution graph example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceUnifiedExecutionGraph.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Unified execution graph summary');
    expect(stdout).toContain('summary');
    expect(stdout).toContain('nodes');
    expect(stdout).toContain('edges');
  });

  test('reference enterprise autonomy architecture example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceEnterpriseAutonomyArchitecture.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Enterprise autonomy architecture');
    expect(stdout).toContain('architecture');
    expect(stdout).toContain('operatingModel');
    expect(stdout).toContain('unifiedGraph');
  });

  test('reference autonomy config drift example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceAutonomyConfigDrift.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Autonomy config drift summary');
    expect(stdout).toContain('comparison');
    expect(stdout).toContain('driftGuard');
    expect(stdout).toContain('block_deploy');
  });

  test('reference operational scorecard example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceOperationalScorecard.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Operational scorecard summary');
    expect(stdout).toContain('operatorSummary');
    expect(stdout).toContain('memoryDiagnostics');
    expect(stdout).toContain('scorecard');
  });

  test('reference enterprise autonomy benchmarks example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceEnterpriseAutonomyBenchmarks.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Enterprise autonomy benchmark report');
    expect(stdout).toContain('enterprise-long-lived-objective');
    expect(stdout).toContain('enterprise-supervised-autonomy');
    expect(stdout).toContain('enterprise-rollback-discipline');
  });

  test('reference coordination safety example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceCoordinationSafety.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Coordination safety summary');
    expect(stdout).toContain('summary');
    expect(stdout).toContain('safety');
    expect(stdout).toContain('anti_loop_triggered');
  });

  test('reference everything smoke example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceEverythingSmoke.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Everything smoke summary');
    expect(stdout).toContain('openApiTools');
    expect(stdout).toContain('curlTools');
    expect(stdout).toContain('postmanTools');
    expect(stdout).toContain('resolvedSecret');
    expect(stdout).toContain('routeSimulation');
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
    expect(stdout).toContain("riskClass: 'high'");
    expect(stdout).toContain("artifactType: 'release_memo'");
    expect(stdout).toContain('incident_trace');
    expect(stdout).toContain('operator_signoff');
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
    expect(stdout).toContain('coordination-disagreement-benchmark');
    expect(stdout).toContain('coordination-recovery-benchmark');
    expect(stdout).toContain('coordination-role-routing-benchmark');
    expect(stdout).toContain('coordination-failure-decomposition-benchmark');
    expect(stdout).toContain('coordination-trust-assumption-benchmark');
  });

  test('reference coordination diagnostics example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceCoordinationDiagnostics.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Coordination diagnostics summary');
    expect(stdout).toContain('reviewer_disagreement');
    expect(stdout).toContain('missing_roles');
    expect(stdout).toContain('low_verifier_quality');
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

  test('reference role-aware coordination example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceRoleAwareCoordination.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Role-aware coordination plan');
    expect(stdout).toContain("strategy: 'role_routed_split_execution'");
    expect(stdout).toContain("role: 'planner'");
    expect(stdout).toContain("actorId: 'planner-alpha'");
    expect(stdout).toContain('Role-aware coordination trace');
    expect(stdout).toContain('verifier: verifier-gamma');
  });

  test('reference advanced disagreement example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceAdvancedDisagreement.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Advanced disagreement summary');
    expect(stdout).toContain("strategy: 'trust_consensus'");
    expect(stdout).toContain("taskFamily: 'release_review'");
    expect(stdout).toContain("action: 'branch_and_retry'");
    expect(stdout).toContain('trustProfile');
  });

  test('reference operator workflow example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceOperatorWorkflow.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Operator summary');
    expect(stdout).toContain('Operator intervention plan');
    expect(stdout).toContain('Operator triage workflow');
    expect(stdout).toContain('Governance ledger summary');
    expect(stdout).toContain('Stitched audit chain');
    expect(stdout).toContain('Governance timeline');
    expect(stdout).toContain("recommendedAction: 'rollback_rollout'");
    expect(stdout).toContain('cross-runtime-triage');
    expect(stdout).toContain('policy:promote');
    expect(stdout).toContain('rollback:rollback_rollout');
  });

  test('reference operator dashboard example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceOperatorDashboard.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Operator dashboard snapshot');
    expect(stdout).toContain('Operator control loop');
    expect(stdout).toContain('governanceTimeline');
    expect(stdout).toContain('operator-dashboard-1');
    expect(stdout).toContain('review_dashboard');
  });

  test('reference coordination verification example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceCoordinationVerification.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Coordination verification summary');
    expect(stdout).toContain("strategy: 'adversarial_cross_check'");
    expect(stdout).toContain("action: 'escalate'");
    expect(stdout).toContain("role: 'critic'");
    expect(stdout).toContain('verificationTrace');
  });

  test('reference coordination quality example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceCoordinationQuality.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Coordination quality summary');
    expect(stdout).toContain('verifierProfile');
    expect(stdout).toContain('executorProfile');
    expect(stdout).toContain('verifierQuality');
    expect(stdout).toContain('executorQuality');
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

  test('reference recovery policy gate example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceRecoveryPolicyGate.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Recovery policy gate summary');
    expect(stdout).toContain("recommendedAction: 'require_recovery_approval'");
    expect(stdout).toContain('branch_from_failure_checkpoint');
    expect(stdout).toContain('Recovery policy evaluation artifact');
  });

  test('reference state incident reconstructor example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceStateIncidentReconstructor.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('State incident reconstruction summary');
    expect(stdout).toContain('State incident reconstruction report');
    expect(stdout).toContain('send_status_update timed out');
    expect(stdout).toContain('Run has pendingPause but status is not paused.');
    expect(stdout).toContain('Use the restored pause metadata to choose resume versus replay.');
  });

  test('reference interop manifest example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceInteropManifest.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Interop manifest summary');
    expect(stdout).toContain('Interop conformance report');
    expect(stdout).toContain('agnostic-agents-extension-manifest');
    expect(stdout).toContain("manifestName: 'reference-interop-extension'");
    expect(stdout).toContain("type: 'job'");
  });

  test('reference interop artifacts example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceInteropArtifacts.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Interop artifact compatibility report');
    expect(stdout).toContain("type: 'trace'");
    expect(stdout).toContain("type: 'traceBundle'");
    expect(stdout).toContain("type: 'policyPack'");
    expect(stdout).toContain("type: 'policyEvaluation'");
    expect(stdout).toContain("type: 'stateBundle'");
    expect(stdout).toContain("type: 'evalReport'");
    expect(stdout).toContain("type: 'manifest'");
  });

  test('reference external conformance flow example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceExternalConformanceFlow.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('External conformance flow summary');
    expect(stdout).toContain("type: 'manifest'");
    expect(stdout).toContain("type: 'evalReport'");
    expect(stdout).toContain('passed: 2');
  });

  test('reference certification kit example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceCertificationKit.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Certification kit summary');
    expect(stdout).toContain("kind: 'provider_adapter'");
    expect(stdout).toContain("kind: 'job_store'");
    expect(stdout).toContain("contract_verified: 2");
  });

  test('reference deployment pattern certification example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceDeploymentPatternCertification.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Deployment pattern certification summary');
    expect(stdout).toContain("kind: 'deployment_pattern'");
    expect(stdout).toContain("pattern: 'supervised_autonomy_stack'");
    expect(stdout).toContain("operationally_certified: 2");
  });

  test('reference enterprise boundaries example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceEnterpriseBoundaries.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Enterprise boundary summary');
    expect(stdout).toContain("kind: 'agnostic-agents/enterprise-boundary-profile'");
    expect(stdout).toContain("kind: 'agnostic-agents/transactional-execution-plan'");
  });

  test('reference proof artifacts example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceProofArtifacts.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Proof artifact summary');
    expect(stdout).toContain("kind: 'agnostic-agents/release-evidence-bundle'");
    expect(stdout).toContain("kind: 'agnostic-agents/route-promotion-proof'");
    expect(stdout).toContain("kind: 'agnostic-agents/policy-autonomy-attestation'");
  });

  test('reference proof rehearsal example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceProofRehearsal.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Proof rehearsal summary');
    expect(stdout).toContain("action: 'promote'");
    expect(stdout).toContain('simulationReport');
    expect(stdout).toContain('failureInjectionReport');
  });

  test('reference federated governance example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceFederatedGovernance.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Federated governance summary');
    expect(stdout).toContain('delegationSummary');
    expect(stdout).toContain("recordKind: 'delegation'");
    expect(stdout).toContain("source: 'partner'");
  });

  test('reference federated boundaries example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceFederatedBoundaries.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Federated boundary summary');
    expect(stdout).toContain("action: 'promote_within_boundary'");
    expect(stdout).toContain("kind: 'agnostic-agents/trust-certification-exchange'");
  });

  test('reference federated control plane example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceFederatedControlPlane.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Federated control-plane summary');
    expect(stdout).toContain("kind: 'external_control_plane_target'");
    expect(stdout).toContain("source: 'partner-runtime'");
    expect(stdout).toContain("kind: 'agnostic-agents/trust-certification-exchange'");
  });

  test('reference outcome contracts example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceOutcomeContracts.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Outcome contract summary');
    expect(stdout).toContain("kind: 'agnostic-agents/workflow-outcome-contract'");
    expect(stdout).toContain('optimizationReview');
    expect(stdout).toContain("recommendation: 'promote'");
  });

  test('reference outcome optimization example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceOutcomeOptimization.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Outcome optimization summary');
    expect(stdout).toContain("kind: 'agnostic-agents/outcome-optimization-experiment'");
    expect(stdout).toContain("recommendation: 'approve_optimization'");
  });

  test('reference interop registry example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceInteropRegistry.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Interop registry summary');
    expect(stdout).toContain("toolFormat: 'agnostic-agents-tool-schema'");
    expect(stdout).toContain("traceFormat: 'agnostic-agents-run-trace'");
    expect(stdout).toContain("policyFormat: 'agnostic-agents-policy-pack'");
    expect(stdout).toContain("evalFormat: 'agnostic-agents-eval-report'");
    expect(stdout).toContain("manifestFormat: 'agnostic-agents-extension-manifest'");
  });

  test('reference state bundle example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceStateBundle.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('State bundle summary');
    expect(stdout).toContain('State contract summary');
    expect(stdout).toContain('State integrity report');
    expect(stdout).toContain('State consistency report');
    expect(stdout).toContain("resolvedJobIds: [ 'state-demo-job' ]");
    expect(stdout).toContain('memoryGovernanceEvents');
    expect(stdout).toContain('memoryContractSurfaces');
  });

  test('reference compensation policy planner example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceCompensationPolicyPlanner.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Compensation policy plan summary');
    expect(stdout).toContain("recommendedAction: 'approval_required'");
    expect(stdout).toContain('notify-user');
    expect(stdout).toContain('Compensation policy evaluation artifact');
  });

  test('reference state bundle example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceStateBundle.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('State bundle summary');
    expect(stdout).toContain('State contract summary');
    expect(stdout).toContain('State integrity report');
    expect(stdout).toContain('State diff summary');
    expect(stdout).toContain('memoryLayers');
    expect(stdout).toContain('memoryGovernanceEvents');
    expect(stdout).toContain('memoryContractSurfaces');
    expect(stdout).toContain('stateKeysAdded');
  });

  test('reference state restore planner example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceStateRestorePlanner.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('State restore plan summary');
    expect(stdout).toContain("sourceEnvironment: 'api-service'");
    expect(stdout).toContain("targetEnvironment: 'worker-service'");
    expect(stdout).toContain('State restore plan details');
    expect(stdout).toContain('Durable restore scenarios');
    expect(stdout).toContain('process-worker');
    expect(stdout).toContain('queue-worker');
    expect(stdout).toContain('service-runtime');
    expect(stdout).toContain('restore_workflow_progress');
    expect(stdout).toContain('restore_scheduler_jobs');
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

  test('reference governed improvement example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceGovernedImprovement.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Governed improvement summary');
    expect(stdout).toContain('agnostic-agents-learned-adaptation');
    expect(stdout).toContain('adaptive_change');
    expect(stdout).toContain('rollback');
    expect(stdout).toContain('reviewSummary');
    expect(stdout).toContain('effectSummary');
    expect(stdout).toContain('improved: 1');
    expect(stdout).toContain('actionPlans');
    expect(stdout).toContain('comparison');
    expect(stdout).toContain('incident_driven_adjustment');
    expect(stdout).toContain('branch_quality_adjustment');
    expect(stdout).toContain('benchmarkReport');
    expect(stdout).toContain('guardDecision');
    expect(stdout).toContain('halt_adaptation');
  });

  test('reference fleet rollout example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceFleetRollout.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Fleet rollout summary');
    expect(stdout).toContain('halt_and_rollback');
    expect(stdout).toContain('adaptiveRegressions');
    expect(stdout).toContain("scope: 'environment'");
    expect(stdout).toContain('safety');
    expect(stdout).toContain("action: 'halt'");
    expect(stdout).toContain('comparison');
    expect(stdout).toContain('improved: true');
    expect(stdout).toContain('routeDiagnostics');
    expect(stdout).toContain('coding-route');
    expect(stdout).toContain('rollbackAdvice');
    expect(stdout).toContain('rollback_recommended');
  });

  test('reference assurance suite example runs', async () => {
    const examplePath = path.join(__dirname, '..', 'examples', 'referenceAssuranceSuite.js');
    const { stdout } = await execFileAsync(process.execPath, [examplePath], {
      cwd: path.join(__dirname, '..'),
    });

    expect(stdout).toContain('Assurance summary');
    expect(stdout).toContain('block');
    expect(stdout).toContain('policy-scope-stable');
    expect(stdout).toContain('learning-bounded');
    expect(stdout).toContain('guardrailDecision');
    expect(stdout).toContain('block_rollout');
    expect(stdout).toContain('recoveryPlan');
    expect(stdout).toContain('rollback_or_quarantine');
    expect(stdout).toContain('branch-replay-integrity');
    expect(stdout).toContain('coordination-failure-check');
  });
});
