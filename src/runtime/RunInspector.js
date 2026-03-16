class RunInspector {
  static summarize(run) {
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
}

module.exports = { RunInspector };
