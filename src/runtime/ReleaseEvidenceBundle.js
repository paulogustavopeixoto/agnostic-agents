const { AssuranceReport } = require('./AssuranceReport');
const { GovernanceRecordLedger } = require('./GovernanceRecordLedger');

class ReleaseEvidenceBundle {
  static build({
    candidateId = 'candidate',
    assurance = null,
    benchmarkReport = null,
    fleet = null,
    governance = null,
    rolloutGuard = null,
    routeProofs = [],
    attestations = [],
  } = {}) {
    const assuranceReport = assurance instanceof AssuranceReport
      ? assurance
      : new AssuranceReport(assurance || {});
    const governanceLedger = governance instanceof GovernanceRecordLedger
      ? governance
      : new GovernanceRecordLedger(governance || {});
    const assuranceSummary = assuranceReport.explain();
    const governanceSummary = governanceLedger.summarize();
    const failedBenchmarks = benchmarkReport?.failed || 0;
    const rolloutAction = rolloutGuard?.action || 'allow_rollout';

    return {
      kind: 'agnostic-agents/release-evidence-bundle',
      version: '1.0.0',
      candidateId,
      assurance: assuranceReport.toJSON(),
      benchmarkReport,
      fleet,
      governance: governanceSummary,
      rolloutGuard,
      routeProofs: [...routeProofs],
      attestations: [...attestations],
      summary: {
        candidateId,
        assuranceVerdict: assuranceSummary.verdict,
        failedBenchmarks,
        governanceRecords: governanceSummary.total || 0,
        routeProofs: routeProofs.length,
        attestations: attestations.length,
        promotionAction:
          assuranceSummary.verdict === 'block' || failedBenchmarks > 0 || rolloutAction === 'block_rollout'
            ? 'block'
            : 'promote',
      },
    };
  }
}

module.exports = { ReleaseEvidenceBundle };
