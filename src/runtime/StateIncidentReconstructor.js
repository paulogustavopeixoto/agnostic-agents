const { StateBundle } = require('./StateBundle');
const { RunInspector } = require('./RunInspector');
const { StateIntegrityChecker } = require('./StateIntegrityChecker');

class StateIncidentReconstructor {
  constructor({ integrityChecker = null } = {}) {
    this.integrityChecker =
      integrityChecker instanceof StateIntegrityChecker
        ? integrityChecker
        : new StateIntegrityChecker(integrityChecker || {});
  }

  reconstruct(bundle) {
    const stateBundle = bundle instanceof StateBundle ? bundle : StateBundle.fromJSON(bundle || {});
    const integrity = this.integrityChecker.check(stateBundle);
    const run = stateBundle.run;
    const summary = run ? RunInspector.summarize(run) : null;
    const failure = run?.errors?.[run.errors.length - 1] || null;
    const failedSteps = (run?.steps || []).filter(step => step.status === 'failed');
    const lastCheckpoint = run?.checkpoints?.[run.checkpoints.length - 1] || null;
    const recommendations = this._buildRecommendations(run, {
      integrity,
      failure,
      failedSteps,
      lastCheckpoint,
      memoryLayers: stateBundle.memory ? Object.keys(stateBundle.memory) : [],
    });

    return {
      runId: run?.id || null,
      status: run?.status || null,
      summary,
      integrity,
      failure,
      failedSteps,
      lastCheckpoint,
      pendingApproval: run?.pendingApproval || null,
      pendingPause: run?.pendingPause || null,
      memoryLayers: stateBundle.memory ? Object.keys(stateBundle.memory) : [],
      recommendations,
    };
  }

  _buildRecommendations(run, { integrity, failure, failedSteps, lastCheckpoint, memoryLayers = [] } = {}) {
    const recommendations = [];

    if (!integrity.valid) {
      recommendations.push('Resolve state-bundle integrity issues before attempting restore or replay.');
    }
    if (run?.pendingApproval) {
      recommendations.push('Reconnect approval handling before attempting to resume this run.');
    }
    if (run?.pendingPause) {
      recommendations.push('Use the restored pause metadata to choose resume versus replay.');
    }
    if (failure) {
      recommendations.push(`Inspect the last error from the bundle: ${failure.message || failure.name || 'Unknown error'}.`);
    }
    if (failedSteps.length) {
      recommendations.push(`Investigate the last failed step captured in state: ${failedSteps[failedSteps.length - 1].id}.`);
    }
    if (lastCheckpoint?.id) {
      recommendations.push(`Use checkpoint "${lastCheckpoint.id}" as the offline replay or branching boundary.`);
    }
    if (memoryLayers.length) {
      recommendations.push(`Review restored memory layers for incident context: ${memoryLayers.join(', ')}.`);
    }
    if (!recommendations.length) {
      recommendations.push('No active incident signals detected in this portable state bundle.');
    }

    return recommendations;
  }
}

module.exports = { StateIncidentReconstructor };
