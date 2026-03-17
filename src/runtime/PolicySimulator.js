const { Run } = require('./Run');
const { TraceSerializer } = require('./TraceSerializer');
const { ToolPolicy } = require('./ToolPolicy');
const { PolicyPack } = require('./PolicyPack');
const { PolicyDecisionReport } = require('./PolicyDecisionReport');
const { PolicyEvaluationRecord } = require('./PolicyEvaluationRecord');

class PolicySimulator {
  constructor({ policyPack = null, toolPolicy = null } = {}) {
    this.policyPack = policyPack
      ? policyPack instanceof PolicyPack
        ? policyPack
        : PolicyPack.fromJSON(policyPack)
      : null;
    this.toolPolicy = toolPolicy
      ? toolPolicy instanceof ToolPolicy
        ? toolPolicy
        : new ToolPolicy(toolPolicy)
      : this.policyPack
        ? this.policyPack.toToolPolicy()
        : new ToolPolicy();
  }

  simulateRequest(tool = {}, args = {}, context = {}) {
    const decision = this.toolPolicy.evaluate(tool, args, context);
    const matchedRule =
      decision.ruleId && this.policyPack?.rules
        ? this.policyPack.rules.find(rule => (rule.id || null) === decision.ruleId) || null
        : null;

    return {
      toolName: tool?.name || null,
      action: decision.action,
      reason: decision.reason || null,
      source: decision.source || 'default',
      ruleId: decision.ruleId || null,
      matchedRule,
      args,
      toolMetadata: tool?.metadata || {},
      runId: context.run?.id || null,
      stage: context.stage || 'request',
      requestIndex: context.requestIndex ?? null,
      toolCallIndex: context.toolCallIndex ?? null,
      runStatus: context.run?.status || null,
      policyPackId: this.policyPack?.id || null,
      policyPackName: this.policyPack?.name || null,
      policyPackVersion: this.policyPack?.version || null,
      evaluatedAt: new Date().toISOString(),
    };
  }

  simulateRequests(requests = [], context = {}) {
    const decisions = requests.map((request, index) =>
      this.simulateRequest(
        {
          name: request.toolName || request.name || null,
          metadata: request.metadata || {},
        },
        request.arguments || request.args || {},
        {
          ...context,
          stage: request.stage || context.stage || 'request',
          requestIndex: index,
        }
      )
    );

    return new PolicyDecisionReport({
      mode: 'requests',
      policyPack: this.policyPack?.toJSON?.() || this.policyPack,
      decisions,
      metadata: context.metadata || {},
    });
  }

  simulateRun(run, { toolsByName = {} } = {}) {
    const sourceRun = run instanceof Run ? run : Run.fromJSON(run || {});
    const decisions = [];
    const toolCalls = sourceRun.toolCalls || [];

    toolCalls.forEach((call, index) => {
      const toolName = call.toolName || call.name || null;
      const knownTool = toolName ? toolsByName[toolName] || null : null;
      decisions.push(
        this.simulateRequest(
          {
            name: toolName,
            metadata: knownTool?.metadata || call.metadata || {},
          },
          call.arguments || {},
          {
            run: sourceRun,
            stage: 'tool_call',
            toolCallIndex: index,
          }
        )
      );
    });

    if (sourceRun.pendingApproval?.toolName) {
      const pending = sourceRun.pendingApproval;
      const knownTool = toolsByName[pending.toolName] || null;
      decisions.push(
        this.simulateRequest(
          {
            name: pending.toolName,
            metadata: knownTool?.metadata || pending.metadata || {},
          },
          pending.arguments || {},
          {
            run: sourceRun,
            stage: 'pending_approval',
          }
        )
      );
    }

    return new PolicyDecisionReport({
      mode: 'run',
      policyPack: this.policyPack?.toJSON?.() || this.policyPack,
      decisions,
      metadata: {
        runId: sourceRun.id,
        status: sourceRun.status,
      },
    });
  }

  simulateTraceBundle(bundle = {}, { toolsByName = {} } = {}) {
    const runs =
      bundle?.format === TraceSerializer.BUNDLE_FORMAT
        ? TraceSerializer.importBundle(bundle)
        : [TraceSerializer.importRun(bundle)];

    const reports = runs.map(run => this.simulateRun(run, { toolsByName }).toJSON());
    return {
      mode: 'trace_bundle',
      policyPack: this.policyPack?.toJSON?.() || this.policyPack,
      reports,
      summary: {
        runs: reports.length,
        totalDecisions: reports.reduce((sum, report) => sum + (report.summary?.total || 0), 0),
      },
    };
  }

  createEvaluationRecord(subject = {}, report) {
    const normalizedReport =
      report instanceof PolicyDecisionReport ? report.toJSON() : new PolicyDecisionReport(report).toJSON();

    return new PolicyEvaluationRecord({
      policyPack: this.policyPack?.toJSON?.() || this.policyPack,
      subject,
      report: normalizedReport,
    });
  }
}

module.exports = { PolicySimulator };
