class AutonomyRolloutGuard {
  evaluate({
    adjustment = null,
    benchmarkReport = null,
    minimumEvidenceScore = 0.8,
  } = {}) {
    const reasons = [];

    if (adjustment?.action === 'widen' && (adjustment.evidenceScore || 0) < minimumEvidenceScore) {
      reasons.push(
        `Autonomy widening evidence ${adjustment.evidenceScore} is below the required minimum ${minimumEvidenceScore}.`
      );
    }

    if (benchmarkReport?.failed > 0) {
      reasons.push(`Autonomy benchmark suite has ${benchmarkReport.failed} failing scenarios.`);
    }

    return {
      action: reasons.length ? 'block_rollout' : 'allow_rollout',
      reasons,
      minimumEvidenceScore,
    };
  }
}

module.exports = { AutonomyRolloutGuard };
