const { StateBundle } = require('./StateBundle');
const { StateIntegrityChecker } = require('./StateIntegrityChecker');

class StateRestorePlanner {
  constructor({ integrityChecker = null } = {}) {
    this.integrityChecker =
      integrityChecker instanceof StateIntegrityChecker
        ? integrityChecker
        : new StateIntegrityChecker(integrityChecker || {});
  }

  buildPlan(bundle, { sourceEnvironment = 'unknown', targetEnvironment = 'unknown' } = {}) {
    const stateBundle = bundle instanceof StateBundle ? bundle : StateBundle.fromJSON(bundle || {});
    const integrity = this.integrityChecker.check(stateBundle);
    const summary = stateBundle.summarize();
    const steps = [];

    steps.push({
      action: 'validate_state_bundle',
      required: true,
      status: integrity.valid ? 'ready' : 'blocked',
      reason: integrity.valid
        ? 'State bundle passed integrity checks.'
        : 'State bundle must pass integrity checks before restore.',
    });

    steps.push({
      action: 'provision_target_runtime_store',
      required: true,
      status: 'ready',
      reason: `Target environment "${targetEnvironment}" must provide a compatible run store.`,
    });

    steps.push({
      action: 'restore_run_state',
      required: true,
      status: integrity.valid ? 'ready' : 'blocked',
      reason: `Restore run "${summary.runId}" into the target environment.`,
    });

    if (summary.memoryLayers.length) {
      steps.push({
        action: 'restore_memory_layers',
        required: true,
        status: integrity.valid ? 'ready' : 'blocked',
        reason: `Restore memory layers: ${summary.memoryLayers.join(', ')}.`,
      });
    }

    steps.push({
      action: 'verify_lineage_and_checkpoints',
      required: true,
      status: integrity.valid ? 'ready' : 'blocked',
      reason: 'Ensure lineage and checkpoint references remain coherent after restore.',
    });

    if (stateBundle.run?.pendingApproval) {
      steps.push({
        action: 'reconnect_approval_flow',
        required: true,
        status: integrity.valid ? 'ready' : 'blocked',
        reason: 'Restored run is approval-gated and must reconnect to an approval surface.',
      });
    }

    if (stateBundle.run?.pendingPause || stateBundle.run?.status === 'paused') {
      steps.push({
        action: 'resume_or_replay_from_restored_state',
        required: false,
        status: integrity.valid ? 'ready' : 'blocked',
        reason: 'Restored run is paused and can be resumed or replayed after validation.',
      });
    }

    return {
      sourceEnvironment,
      targetEnvironment,
      summary,
      integrity,
      steps,
      readyToRestore: integrity.valid,
    };
  }
}

module.exports = { StateRestorePlanner };
