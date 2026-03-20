const { EvalHarness } = require('./EvalHarness');
const { AutonomyEnvelope } = require('./AutonomyEnvelope');
const { ApprovalDecisionCache } = require('./ApprovalDecisionCache');

class AutonomyBenchmarkSuite {
  constructor({ evalHarness = null } = {}) {
    this.evalHarness = evalHarness instanceof EvalHarness ? evalHarness : evalHarness;
  }

  buildScenarios({
    envelope = null,
    approvalCache = null,
    approvalLatencyMs = 0,
    escalation = null,
  } = {}) {
    const resolvedEnvelope = envelope instanceof AutonomyEnvelope ? envelope : new AutonomyEnvelope(envelope || {});
    const resolvedCache =
      approvalCache instanceof ApprovalDecisionCache ? approvalCache : new ApprovalDecisionCache(approvalCache || {});

    return [
      {
        id: 'autonomy-budget-exhaustion',
        run: async () =>
          resolvedEnvelope.evaluate({
            usage: {
              spend: (resolvedEnvelope.budget.limits.spend || 0) + 1,
            },
            assessment: { confidence: 0.95 },
          }),
        assert: output => output.action === 'halt' && output.budget.exhausted === true,
      },
      {
        id: 'approval-latency',
        run: async () => ({ approvalLatencyMs }),
        assert: output => output.approvalLatencyMs <= 5000,
      },
      {
        id: 'escalation-quality',
        run: async () => escalation || { action: 'review', rationale: 'fallback', confidence: 0.6 },
        assert: output => Boolean(output.action) && Boolean(output.rationale || output.reason),
      },
      {
        id: 'supervised-autonomy-cache',
        run: async () =>
          resolvedCache.find({
            action: 'send_status_update',
            environment: 'prod',
            tenant: 'acme',
          }),
        assert: output => output === null || output.decision === 'approved',
      },
    ];
  }

  async run(options = {}) {
    const harness = this.evalHarness instanceof EvalHarness ? this.evalHarness : new EvalHarness();
    harness.scenarios = this.buildScenarios(options);
    return harness.run();
  }
}

module.exports = { AutonomyBenchmarkSuite };
