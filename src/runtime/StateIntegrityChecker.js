const { StateBundle } = require('./StateBundle');
const { StateBundleSerializer } = require('./StateBundleSerializer');
const { StateContractRegistry } = require('./StateContractRegistry');

class StateIntegrityChecker {
  constructor({ contractRegistry = null } = {}) {
    this.contractRegistry =
      contractRegistry instanceof StateContractRegistry
        ? contractRegistry
        : new StateContractRegistry(contractRegistry || {});
  }

  check(bundle) {
    const payload = bundle?.toJSON ? bundle.toJSON() : bundle || {};
    const serializerValidation = StateBundleSerializer.validate(payload);
    const errors = [...serializerValidation.errors];
    const warnings = [];

    if (!serializerValidation.valid) {
      return {
        valid: false,
        errors,
        warnings,
        contract: this.contractRegistry.describe('state_bundle'),
      };
    }

    const restored = bundle instanceof StateBundle ? bundle : StateBundle.fromJSON(payload);
    const summary = restored.summarize();

    if (payload.summary) {
      if (payload.summary.runId !== summary.runId) {
        errors.push('summary.runId does not match run.id.');
      }
      if (payload.summary.status !== summary.status) {
        errors.push('summary.status does not match run.status.');
      }
      if (payload.summary.checkpointCount !== summary.checkpointCount) {
        errors.push('summary.checkpointCount does not match run.checkpoints length.');
      }
      if (payload.summary.messageCount !== summary.messageCount) {
        errors.push('summary.messageCount does not match run.messages length.');
      }
      if (payload.summary.toolCallCount !== summary.toolCallCount) {
        errors.push('summary.toolCallCount does not match run.toolCalls length.');
      }
    }

    const childRuns = restored.run?.metrics?.childRuns;
    if (childRuns && childRuns.count !== (childRuns.items || []).length) {
      errors.push('run.metrics.childRuns.count does not match childRuns.items length.');
    }

    if (!restored.run?.metadata?.lineage?.rootRunId) {
      errors.push('run.metadata.lineage.rootRunId is required for portable restoration.');
    }

    if (restored.run?.pendingApproval && restored.run.status !== 'waiting_for_approval') {
      warnings.push('Run has pendingApproval but status is not waiting_for_approval.');
    }

    if (restored.run?.pendingPause && restored.run.status !== 'paused') {
      warnings.push('Run has pendingPause but status is not paused.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      contract: this.contractRegistry.describe('state_bundle'),
      summary,
    };
  }
}

module.exports = { StateIntegrityChecker };
