const {
  InvariantRegistry,
  AssuranceSuite,
  AssuranceGuardrail,
  AssuranceRecoveryPlanner,
} = require('../index');

async function main() {
  const invariants = new InvariantRegistry({
    invariants: [
      {
        id: 'policy-scope-stable',
        surface: 'policy',
        description: 'Policy scope must stay explicit.',
        check: async context => ({
          passed: context.policyScopeExplicit === true,
          reason: context.policyScopeExplicit === true ? null : 'Policy scope was not explicit.',
        }),
      },
      {
        id: 'learning-bounded',
        surface: 'learning',
        severity: 'critical',
        description: 'Learning changes must stay bounded.',
        check: async context => ({
          passed: context.learningBounded === true,
          reason: context.learningBounded === true ? null : 'Learning changes were not bounded.',
        }),
      },
    ],
  });

  const suite = new AssuranceSuite({
    invariants,
    scenarios: [
      {
        id: 'replay-safe',
        run: async () => ({ replayable: true }),
        assert: async output => output.replayable === true,
      },
      {
        id: 'branch-replay-integrity',
        run: async () => ({ branchReplayStable: true }),
        assert: async output => output.branchReplayStable === true,
      },
      {
        id: 'recovery-playbook-check',
        run: async () => ({ recoveryPlanReady: true }),
        assert: async output => output.recoveryPlanReady === true,
      },
      {
        id: 'coordination-failure-check',
        run: async () => ({ coordinationFallbackReady: false }),
        assert: async output => output.coordinationFallbackReady === true,
      },
    ],
  });

  const report = await suite.run({
    policyScopeExplicit: true,
    learningBounded: false,
  });
  const guardrail = new AssuranceGuardrail();
  const guardrailDecision = guardrail.evaluate(report);
  const recoveryPlanner = new AssuranceRecoveryPlanner();
  const recoveryPlan = recoveryPlanner.plan(report);

  console.log('Assurance summary:');
  console.dir(
    {
      report: report.toJSON(),
      guardrailDecision,
      recoveryPlan,
    },
    { depth: null }
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
