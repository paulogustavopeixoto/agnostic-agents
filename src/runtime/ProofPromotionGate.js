const { ReleaseEvidenceBundle } = require('./ReleaseEvidenceBundle');

class ProofPromotionGate {
  evaluate({
    evidenceBundle = null,
    simulationReport = null,
    failureInjectionReport = null,
  } = {}) {
    const bundle = evidenceBundle?.kind === 'agnostic-agents/release-evidence-bundle'
      ? evidenceBundle
      : ReleaseEvidenceBundle.build(evidenceBundle || {});
    const reasons = [];

    if (bundle.summary?.promotionAction !== 'promote') {
      reasons.push('Release evidence bundle does not support promotion.');
    }

    if ((simulationReport?.failed || 0) > 0) {
      reasons.push(`Pre-release simulation suite has ${simulationReport.failed} failing scenarios.`);
    }

    if ((failureInjectionReport?.failed || 0) > 0) {
      reasons.push(`Failure-injection suite has ${failureInjectionReport.failed} failing scenarios.`);
    }

    if ((bundle.routeProofs || []).length === 0) {
      reasons.push('At least one route-promotion proof is required.');
    }

    if ((bundle.attestations || []).length === 0) {
      reasons.push('At least one policy/autonomy attestation is required.');
    }

    return {
      action: reasons.length === 0 ? 'promote' : 'hold',
      reasons,
      summary: {
        candidateId: bundle.candidateId,
        simulationFailures: simulationReport?.failed || 0,
        failureInjectionFailures: failureInjectionReport?.failed || 0,
        routeProofs: (bundle.routeProofs || []).length,
        attestations: (bundle.attestations || []).length,
      },
    };
  }
}

module.exports = { ProofPromotionGate };
