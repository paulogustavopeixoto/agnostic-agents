class RunInspector {
  static summarize(run) {
    const childRunAggregate = RunInspector._summarizeChildRunMetrics(run.metrics?.childRuns);
    return {
      id: run.id,
      status: run.status,
      input: run.input,
      output: run.output,
      events: run.events.length,
      steps: run.steps.map(step => ({
        id: step.id,
        type: step.type,
        status: step.status,
        durationMs: step.durationMs ?? null,
      })),
      checkpoints: run.checkpoints.map(checkpoint => ({
        id: checkpoint.id,
        label: checkpoint.label,
        status: checkpoint.status,
      })),
      metrics: run.metrics,
      childRunAggregate,
      lineage: run.metadata?.lineage || null,
      assessment: run.state?.assessment || null,
      evidence: run.state?.evidenceGraph?.summarize
        ? run.state.evidenceGraph.summarize()
        : run.state?.evidenceGraph
          ? {
              nodes: run.state.evidenceGraph.nodes?.length || 0,
              edges: run.state.evidenceGraph.edges?.length || 0,
            }
          : null,
      pendingApproval: run.pendingApproval,
      pendingPause: run.pendingPause,
      errors: run.errors,
    };
  }

  static _summarizeChildRunMetrics(childRuns = {}) {
    const items = Array.isArray(childRuns?.items) ? childRuns.items : [];
    return {
      count: items.length,
      tokenUsage: items.reduce(
        (acc, item) => {
          acc.prompt += item.tokenUsage?.prompt || 0;
          acc.completion += item.tokenUsage?.completion || 0;
          acc.total += item.tokenUsage?.total || 0;
          return acc;
        },
        { prompt: 0, completion: 0, total: 0 }
      ),
      cost: items.reduce((sum, item) => sum + (item.cost || 0), 0),
      timings: items.reduce((acc, item) => {
        for (const [key, value] of Object.entries(item.timings || {})) {
          acc[key] = (acc[key] || 0) + (value || 0);
        }
        return acc;
      }, {}),
    };
  }
}

module.exports = { RunInspector };
