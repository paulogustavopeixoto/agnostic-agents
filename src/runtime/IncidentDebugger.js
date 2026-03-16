const { Run } = require('./Run');
const { RunInspector } = require('./RunInspector');
const { RunTreeInspector } = require('./RunTreeInspector');
const { TraceDiffer } = require('./TraceDiffer');

class IncidentDebugger {
  constructor({ runStore } = {}) {
    this.runStore = runStore;
  }

  async createReport(runId, { compareToRunId = null } = {}) {
    if (!this.runStore?.getRun) {
      throw new Error('IncidentDebugger requires a runStore with getRun().');
    }

    const storedRun = await this.runStore.getRun(runId);
    if (!storedRun) {
      throw new Error(`Run "${runId}" not found.`);
    }

    const run = storedRun instanceof Run ? storedRun : Run.fromJSON(storedRun);
    const summary = RunInspector.summarize(run);
    const rootRunId = run.metadata?.lineage?.rootRunId || run.id;
    const runTree = this.runStore?.listRuns
      ? await RunTreeInspector.build(this.runStore, { rootRunId })
      : null;

    let comparison = null;
    if (compareToRunId) {
      const storedComparisonRun = await this.runStore.getRun(compareToRunId);
      if (!storedComparisonRun) {
        throw new Error(`Comparison run "${compareToRunId}" not found.`);
      }
      const comparisonRun =
        storedComparisonRun instanceof Run ? storedComparisonRun : Run.fromJSON(storedComparisonRun);
      comparison = TraceDiffer.diff(comparisonRun, run);
    }

    const failure = run.errors?.[run.errors.length - 1] || null;
    const failedSteps = (run.steps || []).filter(step => step.status === 'failed');
    const lastCheckpoint = run.checkpoints?.[run.checkpoints.length - 1] || null;
    const recommendations = this._buildRecommendations(run, {
      failure,
      failedSteps,
      lastCheckpoint,
      comparison,
    });

    return {
      runId: run.id,
      rootRunId,
      status: run.status,
      summary,
      aggregatedMetrics: runTree?.subtreeMetrics || null,
      failure,
      failedSteps,
      lastCheckpoint,
      pendingApproval: run.pendingApproval || null,
      pendingPause: run.pendingPause || null,
      runTree,
      renderedRunTree: runTree ? RunTreeInspector.render(runTree) : null,
      comparison,
      recommendations,
    };
  }

  _buildRecommendations(run, { failure, failedSteps, lastCheckpoint, comparison } = {}) {
    const recommendations = [];

    if (run.pendingApproval) {
      recommendations.push('Resolve the pending approval before attempting replay or resume.');
    }
    if (run.pendingPause) {
      recommendations.push('Resume the paused run or branch from the last checkpoint for investigation.');
    }
    if (failure) {
      recommendations.push(`Inspect the last error: ${failure.message || failure.name || 'Unknown error'}.`);
    }
    if (failedSteps.length) {
      recommendations.push(
        `Replay or branch near the failed step: ${failedSteps[failedSteps.length - 1].id}.`
      );
    }
    if (lastCheckpoint?.id) {
      recommendations.push(`Use checkpoint "${lastCheckpoint.id}" for partial replay or branching.`);
    }
    if (comparison?.statusChanged || comparison?.outputChanged) {
      recommendations.push('Review the trace diff to understand where this run diverged from the comparison run.');
    }
    if (!recommendations.length) {
      recommendations.push('No active incident state detected; compare this run against another trace if deeper analysis is needed.');
    }

    return recommendations;
  }
}

module.exports = { IncidentDebugger };
