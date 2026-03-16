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
      pendingApproval: run.pendingApproval,
      pendingPause: run.pendingPause,
      errors: run.errors,
    };
  }
}

module.exports = { RunInspector };
