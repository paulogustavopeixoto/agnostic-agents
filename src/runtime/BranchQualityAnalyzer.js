const { Run } = require('./Run');
const { RunInspector } = require('./RunInspector');
const { TraceDiffer } = require('./TraceDiffer');
const { BaseRunStore } = require('./stores/BaseRunStore');

/**
 * Compares replay and branch outcomes so operators can identify which path
 * produced the healthiest runtime result.
 */
class BranchQualityAnalyzer {
  /**
   * @param {object} [options]
   * @param {BaseRunStore} [options.runStore]
   */
  constructor({ runStore } = {}) {
    this.runStore = runStore ? BaseRunStore.assert(runStore, 'BranchQualityAnalyzer runStore') : null;
  }

  /**
   * Compare a baseline run against candidate branches/replays.
   *
   * @param {Run|object} baselineRun
   * @param {Array<Run|object>} candidateRuns
   * @returns {object}
   */
  compare(baselineRun, candidateRuns = []) {
    const baseline = baselineRun instanceof Run ? baselineRun : Run.fromJSON(baselineRun || {});
    const candidates = candidateRuns.map(run => (run instanceof Run ? run : Run.fromJSON(run || {})));
    const items = [baseline, ...candidates].map(run => this._summarizeQuality(run));
    const rankedRuns = [...items].sort((left, right) => right.qualityScore - left.qualityScore);
    const baselineSummary = items[0];
    const comparisons = candidates.map(run => ({
      runId: run.id,
      qualityScore: this._summarizeQuality(run).qualityScore,
      diff: TraceDiffer.diff(baseline, run),
    }));

    return {
      baselineRunId: baseline.id,
      bestRunId: rankedRuns[0]?.runId || baseline.id,
      rankedRuns,
      comparisons,
      recommendations: this._buildRecommendations(baselineSummary, rankedRuns, comparisons),
    };
  }

  /**
   * Analyze all runs in a root lineage family.
   *
   * @param {string} rootRunId
   * @returns {Promise<object>}
   */
  async analyzeFamily(rootRunId) {
    if (!this.runStore?.listRuns || !this.runStore?.getRun) {
      throw new Error('BranchQualityAnalyzer requires a runStore with listRuns() and getRun() for family analysis.');
    }

    const runs = await this.runStore.listRuns();
    const family = runs
      .map(run => (run instanceof Run ? run : Run.fromJSON(run || {})))
      .filter(run => (run.metadata?.lineage?.rootRunId || run.id) === rootRunId);

    if (!family.length) {
      throw new Error(`No runs found for root run "${rootRunId}".`);
    }

    const baseline = family.find(run => run.id === rootRunId) || family[0];
    const candidates = family.filter(run => run.id !== baseline.id);
    return this.compare(baseline, candidates);
  }

  _summarizeQuality(run) {
    const summary = RunInspector.summarize(run);
    const confidence = typeof summary.assessment?.confidence === 'number' ? summary.assessment.confidence : null;
    const verification = summary.assessment?.verification?.action || null;
    const evidenceConflicts = summary.assessment?.evidenceConflicts || 0;
    const errorCount = Array.isArray(summary.errors) ? summary.errors.length : 0;
    const pendingPenalty = (summary.pendingApproval ? 8 : 0) + (summary.pendingPause ? 6 : 0);
    const statusScore =
      summary.status === 'completed' ? 45 : summary.status === 'paused' ? 18 : summary.status === 'failed' ? -10 : 8;
    const qualityScore = Math.max(
      0,
      Math.round(
        statusScore +
          (summary.output != null ? 8 : 0) +
          (confidence != null ? confidence * 25 : 10) +
          (verification === 'allow' || verification === 'passed' ? 10 : verification ? -8 : 0) -
          evidenceConflicts * 6 -
          errorCount * 12 -
          pendingPenalty
      )
    );

    return {
      runId: summary.id,
      status: summary.status,
      qualityScore,
      confidence,
      verification,
      evidenceConflicts,
      errorCount,
      pendingApproval: Boolean(summary.pendingApproval),
      pendingPause: Boolean(summary.pendingPause),
      lineage: summary.lineage,
    };
  }

  _buildRecommendations(baseline, rankedRuns, comparisons) {
    const recommendations = [];
    const best = rankedRuns[0];

    if (best && best.runId !== baseline.runId && best.qualityScore > baseline.qualityScore) {
      recommendations.push(
        `Prefer run "${best.runId}" over baseline "${baseline.runId}"; it has the strongest observed quality score.`
      );
    }

    const divergence = comparisons.find(item => item.diff.firstDivergingStepIndex >= 0);
    if (divergence) {
      recommendations.push(
        `Inspect the first diverging step around index ${divergence.diff.firstDivergingStepIndex} to understand branch quality differences.`
      );
    }

    const healthierCompletedRun = rankedRuns.find(
      run => run.status === 'completed' && run.errorCount === 0 && run.pendingApproval === false && run.pendingPause === false
    );
    if (healthierCompletedRun) {
      recommendations.push(
        `Use completed run "${healthierCompletedRun.runId}" as the comparison anchor for future replay and routing analysis.`
      );
    }

    if (!recommendations.length) {
      recommendations.push('No branch-quality outlier detected; expand replay coverage before changing routing behavior.');
    }

    return recommendations;
  }
}

module.exports = { BranchQualityAnalyzer };
